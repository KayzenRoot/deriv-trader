/**
 * MarketScannerRuntime (DT-WP-02 F1): the assembled read-only orchestrator.
 * Drives CONNECT -> symbol discovery -> capability refresh -> bounded
 * 60/180/300 expiry probes (proven from actual proposal outcomes, never
 * guessed) -> shared tick subscriptions -> proposal cache -> Payout Pulse
 * cycles -> freshness snapshots -> Opportunity Lattice -> capture pipeline.
 * No strategy, risk, execution or economic logic lives here.
 */
import {
  ApiBudgetManager,
  ConnectionSupervisor,
} from "@deriv-trader/deriv-adapter";
import type {
  BudgetTelemetry,
  PublicWsClient,
} from "@deriv-trader/deriv-adapter";
import type {
  Clock,
  ConnectionHealth,
  ExpirySeconds,
  MarketDataSource,
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";
import { SharedTickHub, SymbolRegistry, summarizeFreshness } from "@deriv-trader/market-data";
import type { FreshnessSnapshot, FreshnessState } from "@deriv-trader/market-data";
import {
  PayoutPulseScheduler,
  eligibilityFromSnapshot,
} from "@deriv-trader/scanner";
import type { Opportunity, PulseCandidate } from "@deriv-trader/scanner";
import {
  BatchWriter,
  blocksDataset,
  checkProposals,
  checkTicks,
  createPassport,
  diskStatus,
  fileSha256,
  finalizeParquet,
  insertProposals,
  insertTicks,
  measureFreeDiskMb,
  openMemory,
  toProposalRow,
  toTickRow,
} from "@deriv-trader/research";
import type {
  DqgFinding,
  ProposalRow,
  TickRow,
} from "@deriv-trader/research";
import { emptyCaptureSession } from "@deriv-trader/db";
import type { CaptureSession } from "@deriv-trader/db";
import type { AppConfig } from "@deriv-trader/config";
import type { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PARSER_VERSION = "deriv-options-2026-09-18";
const EXPIRIES: ExpirySeconds[] = [60, 180, 300];
const PROBE_FAILURE_REVOKE_AFTER = 3;

export interface RuntimeTransport {
  readonly client: PublicWsClient;
  readonly onDisconnect: (listener: () => void) => void;
}

export interface RuntimeOptions {
  readonly config: AppConfig;
  readonly source: MarketDataSource;
  readonly budget?: ApiBudgetManager;
  readonly clock?: Clock;
  readonly transport?: RuntimeTransport;
  readonly captureRoot?: string;
  readonly universeCap?: number;
}

interface CachedQuote {
  readonly quote: ProposalQuote;
  readonly receivedAtMs: number;
}

export interface OpportunitiesSnapshot {
  readonly generatedAt: string;
  readonly count: number;
  readonly eligible: number;
  readonly opportunities: Opportunity[];
}

export class MarketScannerRuntime {
  readonly config: AppConfig;
  readonly source: MarketDataSource;
  readonly budget: ApiBudgetManager;
  readonly registry: SymbolRegistry;
  readonly hub: SharedTickHub;
  readonly pulse: PayoutPulseScheduler;
  readonly supervisor: ConnectionSupervisor | null;
  readonly clock: Clock;
  readonly captureRoot: string;
  session: CaptureSession;

  private readonly universeCap: number;
  private readonly quotes = new Map<string, CachedQuote>();
  private snapshots: FreshnessSnapshot[] = [];
  private readonly revoked = new Map<string, Set<ExpirySeconds>>();
  private readonly probeFailures = new Map<string, number>();
  private readonly registryAges = new Map<string, { symbolsAt: number; capabilityAt: number | null }>();
  private readonly skew = new Map<string, number>();
  private readonly untrusted = new Set<string>();
  private readonly tickWriter: BatchWriter<TickRow>;
  private readonly proposalWriter: BatchWriter<ProposalRow>;
  private tickOverflow: TickRow[] = [];
  private proposalOverflow: ProposalRow[] = [];
  private findings: DqgFinding[] = [];
  private finalizedFiles: { path: string; sha256: string; rows: number }[] = [];
  private partCounter = 0;
  private lastRollMs: number;
  private lastDiskMb: number | null = null;
  private diskStopped = false;
  private duckdb: { instance: DuckDBInstance; connection: DuckDBConnection } | null = null;
  private started = false;

  constructor(options: RuntimeOptions) {
    this.config = options.config;
    this.source = options.source;
    this.clock = options.clock ?? systemClock();
    this.captureRoot = options.captureRoot ?? options.config.dataRoot;
    this.universeCap = options.universeCap ?? 50;
    this.budget =
      options.budget ??
      new ApiBudgetManager(
        {
          proposal: { perMinute: options.config.budgetProposalPerMin, perLong: options.config.budgetProposalPerHour, longWindowMs: 3600_000 },
          other: { perMinute: options.config.budgetOtherPerMin, perLong: options.config.budgetOtherPerHour, longWindowMs: 3600_000 },
          rest: { perMinute: options.config.budgetRestPerMin, perLong: options.config.budgetRestPer10Min, longWindowMs: 600_000 },
          proposalReserveFraction: options.config.budgetProposalReserve,
        },
        this.clock,
      );
    this.registry = new SymbolRegistry(this.source, { clock: this.clock });
    this.hub = new SharedTickHub(this.source, this.clock);
    this.pulse = new PayoutPulseScheduler(
      this.budget,
      (assumptions) => this.source.requestProposal(assumptions),
      { clock: this.clock, threshold: options.config.scannerPayoutThreshold },
    );
    const degrade = (): "NONE" | "RAW_PAYLOADS_OFF" | "RESEARCH_PAUSED" =>
      this.diskStopped ? "RESEARCH_PAUSED" : "NONE";
    // Auto-flush overflow is stashed (never dropped silently); captureCycle
    // drains writers + overflow together on roll.
    this.tickWriter = new BatchWriter<TickRow>({
      maxRows: options.config.captureBatchRows,
      onFlush: (rows) => {
        for (const row of rows) this.tickOverflow.push(row);
      },
      shouldDegrade: degrade,
    });
    this.proposalWriter = new BatchWriter<ProposalRow>({
      maxRows: options.config.captureBatchRows,
      onFlush: (rows) => {
        for (const row of rows) this.proposalOverflow.push(row);
      },
      shouldDegrade: degrade,
    });
    this.session = emptyCaptureSession(
      `sess_${this.clock.nowMs().toString(36)}`,
      `ds_${this.clock.nowMs().toString(36)}`,
      options.config.buildSha,
    );
    this.lastRollMs = this.clock.nowMs();
    if (options.transport) {
      const transport = options.transport;
      this.supervisor = new ConnectionSupervisor({
        connect: () => transport.client.connect(),
        restoreSubscriptions: async (): Promise<void> => {
          await this.restoreAfterReconnect();
        },
        heartbeat: () =>
          transport.client
            .request({ ping: 1 }, { timeoutMs: 5000 })
            .then(() => true)
            .catch(() => false),
        onInvalidate: () => {
          this.hub.invalidateAll();
          this.budget.recordReconnect();
        },
        clock: this.clock,
        baseDelayMs: options.config.wsReconnectBaseMs,
        maxDelayMs: options.config.wsReconnectMaxMs,
        heartbeatMs: options.config.wsHeartbeatMs,
      });
      transport.onDisconnect(() => {
        void this.supervisor?.handleConnectionLost("CONNECTION_LOST");
      });
    } else {
      this.supervisor = null;
    }
  }

  /** CONNECT: supervisor drives socket + first restore; then initial universe. */
  async connect(): Promise<void> {
    this.started = true;
    if (this.supervisor) {
      await this.supervisor.start();
    }
    await this.refreshUniverse();
  }

  /** Symbols + capabilities for the current universe (bounded per cycle). */
  async refreshUniverse(): Promise<void> {
    await this.registry.refreshSymbols();
    const now = this.clock.nowMs();
    const records = this.registry.symbols().slice(0, this.universeCap);
    for (const record of records) {
      const ages = this.registryAges.get(record.instrument.underlyingSymbol) ?? {
        symbolsAt: now,
        capabilityAt: null,
      };
      ages.symbolsAt = now;
      const refreshed = await this.registry.refreshCapabilities(record.instrument.underlyingSymbol);
      if (refreshed?.lastCapabilityRefreshAt) {
        ages.capabilityAt = Date.parse(refreshed.lastCapabilityRefreshAt);
      }
      this.registryAges.set(record.instrument.underlyingSymbol, ages);
    }
  }

  private probeAssumptions(
    symbol: string,
    direction: "CALL" | "PUT",
    expiry: ExpirySeconds,
  ): ProposalAssumptions {
    return {
      contractType: direction,
      underlyingSymbol: symbol,
      durationSeconds: expiry,
      amount: this.config.scannerProbeAmount,
      basis: this.config.scannerProbeBasis,
      currency: this.config.scannerProbeCurrency,
    };
  }

  /** Bounded capability probes; support proven ONLY from KNOWN outcomes. */
  async probeExpiries(symbols?: string[]): Promise<{ proven: number; revoked: number }> {
    let proven = 0;
    let revoked = 0;
    const records = (symbols
      ? symbols.flatMap((s) => {
          const record = this.registry.get(s);
          return record ? [record] : [];
        })
      : this.registry.symbols()
    ).slice(0, this.universeCap);
    for (const record of records) {
      const symbol = record.instrument.underlyingSymbol;
      const revokedSet = this.revoked.get(symbol) ?? new Set<ExpirySeconds>();
      for (const expiry of EXPIRIES) {
        if (record.supportedExpiries.includes(expiry) || revokedSet.has(expiry)) continue;
        const hasCall = record.capabilities.some((c) => c.contractType === "CALL");
        const hasPut = record.capabilities.some((c) => c.contractType === "PUT");
        if (!hasCall && !hasPut) continue;
        for (const direction of ["CALL", "PUT"] as const) {
          if (direction === "CALL" && !hasCall) continue;
          if (direction === "PUT" && !hasPut) continue;
          const assumptions = this.probeAssumptions(symbol, direction, expiry);
          const quote = await this.source.requestProposal(assumptions);
          this.storeQuote(quote);
          const key = `${symbol}|${direction}|${String(expiry)}`;
          if (quote.state === "KNOWN" && quote.effectivePayout !== null) {
            this.registry.proveExpiry(symbol, expiry);
            this.probeFailures.delete(key);
            proven += 1;
          } else {
            const failures = (this.probeFailures.get(key) ?? 0) + 1;
            this.probeFailures.set(key, failures);
            if (failures >= PROBE_FAILURE_REVOKE_AFTER) {
              revokedSet.add(expiry);
              this.revoked.set(symbol, revokedSet);
              revoked += 1;
            }
          }
        }
      }
    }
    return { proven, revoked };
  }

  private storeQuote(quote: ProposalQuote): void {
    this.quotes.set(quote.key, { quote, receivedAtMs: this.clock.nowMs() });
    this.proposalWriter.push(
      toProposalRow(quote, { parserVersion: PARSER_VERSION, buildSha: this.config.buildSha }),
    );
    this.session = {
      ...this.session,
      proposalRows: this.session.proposalRows + 1,
      symbols: this.session.symbols.includes(quote.assumptions.underlyingSymbol)
        ? this.session.symbols
        : [...this.session.symbols, quote.assumptions.underlyingSymbol],
    };
  }

  /** Ensure one shared tick subscription per symbol (runtime capture consumer). */
  async ensureTicks(symbols?: string[]): Promise<void> {
    const targets = (symbols ?? this.registry.symbols().map((r) => r.instrument.underlyingSymbol)).slice(
      0,
      this.universeCap,
    );
    for (const symbol of targets) {
      await this.hub.subscribe(symbol, (tick) => {
        const receiveMs = Date.parse(tick.receiveTime);
        if (Number.isFinite(receiveMs)) {
          this.skew.set(symbol, Math.abs(receiveMs / 1000 - tick.eventTime));
        }
        this.tickWriter.push(
          toTickRow(tick, { parserVersion: PARSER_VERSION, buildSha: this.config.buildSha }),
        );
        this.session = {
          ...this.session,
          tickRows: this.session.tickRows + 1,
          symbols: this.session.symbols.includes(symbol)
            ? this.session.symbols
            : [...this.session.symbols, symbol],
        };
      });
    }
  }

  /** One Payout Pulse cycle over proven candidates (peek-gated, single-count). */
  async scannerCycle(): Promise<ProposalQuote[]> {
    const candidates = this.pulseCandidates();
    const quotes = await this.pulse.refresh(candidates);
    for (const quote of quotes) this.storeQuote(quote);
    this.lastPulseAtMs = this.clock.nowMs();
    this.rebuildSnapshots();
    return quotes;
  }

  private pulseCandidates(): PulseCandidate[] {
    const out: PulseCandidate[] = [];
    for (const record of this.registry.symbols()) {
      const symbol = record.instrument.underlyingSymbol;
      const revokedSet = this.revoked.get(symbol);
      for (const expiry of record.supportedExpiries) {
        if (revokedSet?.has(expiry)) continue;
        for (const direction of ["CALL", "PUT"] as const) {
          const key = `${symbol}|${direction}|${String(expiry)}|${this.config.scannerProbeCurrency}|${this.config.scannerProbeBasis}|${String(this.config.scannerProbeAmount)}`;
          const cached = this.quotes.get(key);
          out.push({
            assumptions: this.probeAssumptions(symbol, direction, expiry),
            priority: cached ? 3 : 4,
            signalDemand: false,
            lastQuoteAtMs: cached?.receivedAtMs ?? null,
            lastEffective: cached?.quote.effectivePayout ?? null,
          });
        }
      }
    }
    return out;
  }

  /** Rebuild per-candidate freshness snapshots consumed by eligibility. */
  rebuildSnapshots(): FreshnessSnapshot[] {
    const now = this.clock.nowMs();
    // Without a supervisor there is no connection to be unhealthy: the source
    // is driven directly (tests/fixture mode), so health is trivially true.
    const healthy = this.supervisor ? this.supervisor.getState() === "HEALTHY" : true;
    const epoch = this.supervisor?.getEpoch() ?? 0;
    const snapshots: FreshnessSnapshot[] = [];
    for (const record of this.registry.symbols()) {
      const symbol = record.instrument.underlyingSymbol;
      const ages = this.registryAges.get(symbol);
      const inspect = this.hub.inspect(symbol);
      const tickState = this.hub.freshness(symbol, healthy);
      const revokedSet = this.revoked.get(symbol);
      for (const expiry of record.supportedExpiries) {
        if (revokedSet?.has(expiry)) continue;
        for (const direction of ["CALL", "PUT"] as const) {
          const key = `${symbol}|${direction}|${String(expiry)}|${this.config.scannerProbeCurrency}|${this.config.scannerProbeBasis}|${String(this.config.scannerProbeAmount)}`;
          const cached = this.quotes.get(key);
          snapshots.push(
            summarizeFreshness({
              underlyingSymbol: symbol,
              direction,
              expirySeconds: expiry,
              registryAgeMs: ages ? now - ages.symbolsAt : null,
              registryState: record.state,
              capabilityAgeMs: ages?.capabilityAt ? now - ages.capabilityAt : null,
              capabilityState: record.error ? "ERROR" : "OK",
              tickAgeMs: inspect && inspect.count > 0 ? Math.max(0, now - inspect.lastSeenAtMs) : null,
              tickState,
              invalidated: inspect?.invalidated ?? true,
              gapped: inspect?.gap ?? false,
              proposalAgeMs: cached ? now - cached.receivedAtMs : null,
              proposalKnown: cached?.quote.state === "KNOWN",
              connectionEpoch: epoch,
              connectionHealthy: healthy,
              skewSeconds: this.skew.get(symbol) ?? null,
              trusted: !this.untrusted.has(symbol) && !(inspect?.untrusted ?? false),
            }),
          );
        }
      }
    }
    this.snapshots = snapshots;
    return snapshots;
  }

  /** Current Opportunity Lattice built from snapshots + cached quotes. */
  lattice(): OpportunitiesSnapshot {
    if (this.snapshots.length === 0) this.rebuildSnapshots();
    const opportunities: Opportunity[] = [];
    for (const snapshot of this.snapshots) {
      const record = this.registry.get(snapshot.underlyingSymbol);
      const key = `${snapshot.underlyingSymbol}|${snapshot.direction}|${String(snapshot.expirySeconds)}|${this.config.scannerProbeCurrency}|${this.config.scannerProbeBasis}|${String(this.config.scannerProbeAmount)}`;
      const cached = this.quotes.get(key);
      const callCompatible =
        record?.capabilities.some((c) => c.contractType === "CALL") ?? false;
      const putCompatible =
        record?.capabilities.some((c) => c.contractType === "PUT") ?? false;
      const result = eligibilityFromSnapshot(
        snapshot,
        cached?.quote ?? null,
        cached ? this.clock.nowMs() - cached.receivedAtMs : null,
        {
          marketActive: record?.state === "ACTIVE_ELIGIBLE",
          contractAvailable: callCompatible || putCompatible,
          expirySupported:
            record?.supportedExpiries.includes(snapshot.expirySeconds) === true &&
            !(this.revoked.get(snapshot.underlyingSymbol)?.has(snapshot.expirySeconds) === true),
          userBlocked: record?.state === "INACTIVE",
          apiHealthy: this.supervisor === null ? true : this.supervisor.getState() === "HEALTHY",
          threshold: this.config.scannerPayoutThreshold,
          proposalTtlMs: this.config.scannerProposalTtlMs,
        },
      );
      opportunities.push({
        underlyingSymbol: snapshot.underlyingSymbol,
        expirySeconds: snapshot.expirySeconds,
        callCompatible,
        putCompatible,
        effectivePayout: cached?.quote.effectivePayout ?? null,
        freshness: snapshot.overall,
        eligibility: result.state,
        blockerReason: result.state === "ELIGIBLE" ? "" : result.reason,
      });
    }
    return {
      generatedAt: new Date(this.clock.nowMs()).toISOString(),
      count: opportunities.length,
      eligible: opportunities.filter((o) => o.eligibility === "ELIGIBLE").length,
      opportunities,
    };
  }

  /** Restore path after reconnect: symbols + exactly-once tick restore. */
  async restoreAfterReconnect(): Promise<string[]> {
    await this.registry.refreshSymbols();
    return this.hub.resubscribeAll();
  }

  /** Direct socket-close wiring (F2): reconnect without waiting for heartbeat. */
  async handleTransportDisconnect(): Promise<void> {
    await this.supervisor?.handleConnectionLost("CONNECTION_LOST");
  }

  private lastPulseAtMs: number | null = null;

  /** /v1/market/status: connection summary plus real counts (§12). */
  statusMarket(): {
    readonly connection: ConnectionHealth;
    readonly connectionSummary: "connected" | "disconnected" | "reconnecting" | "degraded" | "stopped";
    readonly symbolsTotal: number;
    readonly eligibleSymbols: number;
    readonly externalSubscriptions: number;
    readonly subscribedSymbols: string[];
    readonly staleSymbols: number;
    readonly freshness: Record<FreshnessState, number>;
  } {
    const state = this.supervisor?.getState() ?? "DISCONNECTED";
    const summary =
      state === "HEALTHY"
        ? "connected"
        : state === "DISCONNECTED"
          ? "disconnected"
          : state === "BACKOFF" || state === "CONNECTING" || state === "SYNCING"
            ? "reconnecting"
            : state === "STOPPED"
              ? "stopped"
              : "degraded";
    const records = this.registry.symbols();
    const freshness: Record<FreshnessState, number> = {
      FRESH: 0,
      AGING: 0,
      STALE: 0,
      GAPPED: 0,
      UNTRUSTED: 0,
    };
    for (const snapshot of this.snapshots) {
      freshness[snapshot.overall] += 1;
    }
    return {
      connection: this.supervisor?.health() ?? {
        state: "DISCONNECTED",
        reconnectCount: 0,
        lastErrorCategory: null,
        lastTransitionAt: new Date(this.clock.nowMs()).toISOString(),
      },
      connectionSummary: summary,
      symbolsTotal: records.length,
      eligibleSymbols: records.filter((r) => r.state === "ACTIVE_ELIGIBLE").length,
      externalSubscriptions: this.hub.externalCount(),
      subscribedSymbols: this.hub.subscribedSymbols(),
      staleSymbols: records.filter((r) => r.state === "STALE" || r.state === "ERROR").length,
      freshness,
    };
  }

  /** /v1/scanner/status: universe/capability/probe/pulse plus budget pressure. */
  statusScanner(): {
    readonly threshold: number;
    readonly proposalTtlMs: number;
    readonly reserveFraction: number;
    readonly universe: number;
    readonly withCapability: number;
    readonly provenExpiries: number;
    readonly cachedQuotes: number;
    readonly lastPulseAt: string | null;
    readonly proposalBudget: BudgetTelemetry;
  } {
    const records = this.registry.symbols();
    let proven = 0;
    let capable = 0;
    for (const record of records) {
      const hasCallPut = record.capabilities.some(
        (c) => c.contractType === "CALL" || c.contractType === "PUT",
      );
      if (hasCallPut) capable += 1;
      const revokedSet = this.revoked.get(record.instrument.underlyingSymbol);
      proven += record.supportedExpiries.filter((e) => !revokedSet?.has(e)).length;
    }
    return {
      threshold: this.config.scannerPayoutThreshold,
      proposalTtlMs: this.config.scannerProposalTtlMs,
      reserveFraction: this.budget.getConfig().proposalReserveFraction,
      universe: records.length,
      withCapability: capable,
      provenExpiries: proven,
      cachedQuotes: this.quotes.size,
      lastPulseAt: this.lastPulseAtMs === null ? null : new Date(this.lastPulseAtMs).toISOString(),
      proposalBudget: this.budget.telemetry("proposal"),
    };
  }

  /** /v1/data/status: actual capture/disk/DQG state — never hardcoded. */
  statusData(): {
    readonly session: CaptureSession;
    readonly capture: "idle" | "live";
    readonly buffers: {
      readonly tickPending: number;
      readonly proposalPending: number;
      readonly tickDropped: number;
      readonly proposalDropped: number;
    };
    readonly partitionsFinalized: number;
    readonly diskMb: number | null;
    readonly diskWarnMb: number;
    readonly diskStopMb: number;
    readonly diskStopped: boolean;
    readonly diskWarn: boolean;
    readonly dqgFindings: number;
    readonly dqgBlocks: boolean;
  } {
    const state = this.snapshotState();
    return {
      session: this.session,
      capture: state.captureActive && !state.diskStopped ? "live" : "idle",
      buffers: {
        tickPending: state.tickPending,
        proposalPending: state.proposalPending,
        tickDropped: state.tickDropped,
        proposalDropped: state.proposalDropped,
      },
      partitionsFinalized: this.partCounter,
      diskMb: state.diskMb,
      diskWarnMb: this.config.diskWarnMb,
      diskStopMb: this.config.diskStopMb,
      diskStopped: state.diskStopped,
      diskWarn:
        state.diskMb === null ? true : state.diskMb < this.config.diskWarnMb,
      dqgFindings: state.findings.length,
      dqgBlocks: blocksDataset(state.findings),
    };
  }

  /** Capture cycle: timed roll → DuckDB insert → finalize → passport → DQG. */
  async captureCycle(): Promise<{ finalized: number; findings: number }> {
    const now = this.clock.nowMs();
    const freeMb = await measureFreeDiskMb(this.captureRoot).catch(() => null);
    this.lastDiskMb = freeMb;
    const pressure =
      freeMb === null
        ? { warn: true, stop: false }
        : diskStatus(freeMb, { warnMb: this.config.diskWarnMb, stopMb: this.config.diskStopMb });
    this.diskStopped = pressure.stop;
    if (this.diskStopped) {
      // Degrade explicitly: discard buffered rows instead of finalizing new
      // files toward an exhausted disk. Buffers read empty afterwards.
      this.tickWriter.flush();
      this.proposalWriter.flush();
      this.tickOverflow.splice(0);
      this.proposalOverflow.splice(0);
      return { finalized: 0, findings: 0 };
    }
    const tickRows = [...this.tickOverflow.splice(0), ...this.tickWriter.flush()];
    const proposalRows = [...this.proposalOverflow.splice(0), ...this.proposalWriter.flush()];
    if (tickRows.length === 0 && proposalRows.length === 0) {
      this.lastRollMs = now;
      return { finalized: 0, findings: 0 };
    }
    // Timed rolling: only finalize to Parquet when the roll interval elapsed;
    // otherwise re-buffer (rows stay for the next cycle, drops counted).
    if (now - this.lastRollMs < this.config.captureRollMs) {
      for (const row of tickRows) this.tickWriter.push(row);
      for (const row of proposalRows) this.proposalWriter.push(row);
      return { finalized: 0, findings: 0 };
    }
    this.lastRollMs = now;
    return this.finalizeBatch(tickRows, proposalRows);
  }

  private async db(): Promise<{ instance: DuckDBInstance; connection: DuckDBConnection }> {
    if (!this.duckdb) this.duckdb = await openMemory();
    return this.duckdb;
  }

  private async finalizeBatch(
    tickRows: TickRow[],
    proposalRows: ProposalRow[],
  ): Promise<{ finalized: number; findings: number }> {
    const { connection } = await this.db();
    const date = new Date(this.clock.nowMs()).toISOString().slice(0, 10);
    let finalized = 0;
    const files: { path: string; sha256: string; rows: number }[] = [];
    if (tickRows.length > 0) {
      await insertTicks(connection, tickRows);
      const part = `ticks/date=${date}/part-${String(this.partCounter).padStart(4, "0")}.parquet`;
      const finalPath = join(this.captureRoot, part);
      await finalizeParquet(connection, "ticks", finalPath);
      files.push({ path: part, sha256: fileSha256(readFileSync(finalPath)), rows: tickRows.length });
      finalized += 1;
    }
    if (proposalRows.length > 0) {
      await insertProposals(connection, proposalRows);
      const part = `proposals/date=${date}/part-${String(this.partCounter).padStart(4, "0")}.parquet`;
      const finalPath = join(this.captureRoot, part);
      await finalizeParquet(connection, "proposals", finalPath);
      files.push({ path: part, sha256: fileSha256(readFileSync(finalPath)), rows: proposalRows.length });
      finalized += 1;
    }
    this.partCounter += 1;
    const tickFindings = checkTicks(tickRows);
    const proposalFindings = checkProposals(proposalRows);
    const findings = [...tickFindings, ...proposalFindings];
    this.findings = [...this.findings, ...findings].slice(-100);
    for (const finding of findings) {
      if (finding.severity === "BLOCK_TRADING_INPUT") {
        for (const row of tickRows) {
          this.untrusted.add(row.underlyingSymbol);
          this.hub.markUntrusted(row.underlyingSymbol);
        }
      }
    }
    if (files.length > 0) {
      const symbols = [...new Set([...tickRows.map((r) => r.underlyingSymbol), ...proposalRows.map((r) => r.underlyingSymbol)])].sort();
      const passport = createPassport({
        datasetId: this.session.datasetId,
        createdAt: new Date(this.clock.nowMs()).toISOString(),
        collectorSha: this.config.buildSha,
        parserVersion: PARSER_VERSION,
        sourceEndpoints: [this.config.derivOptionsPublicWsUrl],
        environment: this.config.environment,
        symbols,
        timeRange: {
          start: this.session.startedAt,
          end: new Date(this.clock.nowMs()).toISOString(),
        },
        files,
      });
      const manifestDir = join(this.captureRoot, "manifests");
      mkdirSync(manifestDir, { recursive: true });
      writeFileSync(
        join(manifestDir, `${this.session.datasetId}-${String(this.partCounter)}.json`),
        `${JSON.stringify(passport, null, 2)}\n`,
      );
    }
    return { finalized, findings: findings.length };
  }

  snapshotState(): {
    snapshots: FreshnessSnapshot[];
    quotes: number;
    tickPending: number;
    proposalPending: number;
    tickDropped: number;
    proposalDropped: number;
    findings: DqgFinding[];
    diskMb: number | null;
    diskStopped: boolean;
    captureActive: boolean;
  } {
    return {
      snapshots: this.snapshots,
      quotes: this.quotes.size,
      tickPending: this.tickWriter.pending(),
      proposalPending: this.proposalWriter.pending(),
      tickDropped: this.tickWriter.droppedCount(),
      proposalDropped: this.proposalWriter.droppedCount(),
      findings: this.findings,
      diskMb: this.lastDiskMb,
      diskStopped: this.diskStopped,
      captureActive: this.started,
    };
  }

  async stop(): Promise<void> {
    await this.supervisor?.stop();
    await this.captureCycle().catch(() => undefined);
    if (this.duckdb) {
      try {
        this.duckdb.connection.closeSync();
      } catch {
        // ignore close errors on shutdown
      }
      this.duckdb = null;
    }
  }
}
