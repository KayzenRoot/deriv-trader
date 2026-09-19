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
  ContractDirection,
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

export type RuntimeLifecycle = "idle" | "running" | "paused" | "stopped";
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
  /** Revoked capability keyed symbol -> expiry -> directions (R2). */
  private readonly revoked = new Map<string, Map<ExpirySeconds, Set<ContractDirection>>>();
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
  private lifecycle: RuntimeLifecycle = "idle";
  private loopTimers: ReturnType<typeof setInterval>[] = [];
  /** Per-task overlap guards: a slow capture must never starve pulse/universe. */
  private readonly loopBusy = { universe: false, pulse: false, capture: false };
  private readonly loopCounters = { universe: 0, pulse: 0, capture: 0 };
  private readonly activePerTask = { universe: 0, pulse: 0, capture: 0 };
  private readonly maxPerTask = { universe: 0, pulse: 0, capture: 0 };
  private skippedCycles = 0;

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
    // Connection readiness is distinct from the continuous scanner lifecycle.
    // Merely connecting must not make capture/status report "live".
    if (this.lifecycle === "stopped") this.lifecycle = "idle";
    if (this.supervisor) {
      await this.supervisor.start();
    }
    await this.refreshUniverse();
  }

  /**
   * Explicit continuous read-only lifecycle (R7) for later Runner control.
   * Bounded periodic universe refresh, tick upkeep, pulse cycles and capture
   * rolls with overlap guard; no auto-start on construct or GET routes.
   */
  startReadOnlyScanner(options: {
    readonly universeMs?: number;
    readonly pulseMs?: number;
    readonly captureMs?: number;
  } = {}): void {
    if (this.lifecycle === "running" && this.loopTimers.length > 0) return;
    this.lifecycle = "running";
    const universeMs = options.universeMs ?? this.config.scannerLoopUniverseMs;
    const pulseMs = options.pulseMs ?? this.config.scannerLoopPulseMs;
    const captureMs = options.captureMs ?? this.config.captureRollMs;
    const every = (
      key: keyof typeof this.loopBusy,
      ms: number,
      task: () => Promise<void>,
    ): void => {
      const timer = setInterval(() => {
        if (this.lifecycle !== "running") return;
        if (this.loopBusy[key]) {
          this.skippedCycles += 1;
          return;
        }
        this.loopBusy[key] = true;
        this.activePerTask[key] += 1;
        this.maxPerTask[key] = Math.max(this.maxPerTask[key], this.activePerTask[key]);
        void task()
          .catch(() => undefined)
          .finally(() => {
            this.activePerTask[key] -= 1;
            this.loopBusy[key] = false;
          });
      }, ms);
      const unref = timer as unknown as { unref?: () => void };
      unref.unref?.();
      this.loopTimers.push(timer);
    };
    every("universe", universeMs, async () => {
      this.loopCounters.universe += 1;
      await this.refreshUniverse();
      // Newly discovered capabilities must be proven/rejected here so the
      // continuous lifecycle is complete without manual probeExpiries() calls.
      await this.probeExpiries();
      await this.ensureTicks();
    });
    every("pulse", pulseMs, async () => {
      this.loopCounters.pulse += 1;
      await this.scannerCycle();
    });
    every("capture", captureMs, async () => {
      this.loopCounters.capture += 1;
      await this.captureCycle();
    });
  }

  /** Pause the loop: timers cancelled, lifecycle paused, capture idle. */
  pauseReadOnlyScanner(): void {
    for (const timer of this.loopTimers) clearInterval(timer);
    this.loopTimers = [];
    if (this.lifecycle === "running") this.lifecycle = "paused";
  }

  loopState(): {
    readonly lifecycle: RuntimeLifecycle;
    readonly timers: number;
    readonly counters: { readonly universe: number; readonly pulse: number; readonly capture: number };
    /** Highest same-task concurrency observed (must stay 1: no overlapping runs). */
    readonly maxConcurrentCycles: number;
    readonly skippedCycles: number;
  } {
    return {
      lifecycle: this.lifecycle,
      timers: this.loopTimers.length,
      counters: { ...this.loopCounters },
      maxConcurrentCycles: Math.max(
        this.maxPerTask.universe,
        this.maxPerTask.pulse,
        this.maxPerTask.capture,
      ),
      skippedCycles: this.skippedCycles,
    };
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
      const revokedForSymbol =
        this.revoked.get(symbol) ?? new Map<ExpirySeconds, Set<ContractDirection>>();
      for (const expiry of EXPIRIES) {
        for (const direction of ["CALL", "PUT"] as const) {
          if (!this.directionCompatible(record, direction)) continue;
          if (this.registry.isProven(symbol, direction, expiry)) continue;
          if (revokedForSymbol.get(expiry)?.has(direction)) continue;
          // Peek first: a throttled probe sends nothing, so it must not
          // count as a failed outcome (that would falsely revoke support).
          if (!this.budget.peek("SIGNAL_PROPOSAL")) continue;
          const assumptions = this.probeAssumptions(symbol, direction, expiry);
          const quote = await this.source.requestProposal(assumptions);
          this.storeQuote(quote);
          const key = `${symbol}|${direction}|${String(expiry)}`;
          if (quote.state === "KNOWN" && quote.effectivePayout !== null) {
            // Direction-specific proof: a CALL success never proves PUT.
            this.registry.proveExpiry(symbol, expiry, direction);
            this.probeFailures.delete(key);
            proven += 1;
          } else {
            const failures = (this.probeFailures.get(key) ?? 0) + 1;
            this.probeFailures.set(key, failures);
            if (failures >= PROBE_FAILURE_REVOKE_AFTER) {
              const revokedDirs =
                revokedForSymbol.get(expiry) ?? new Set<ContractDirection>();
              revokedDirs.add(direction);
              revokedForSymbol.set(expiry, revokedDirs);
              this.revoked.set(symbol, revokedForSymbol);
              revoked += 1;
            }
          }
        }
      }
    }
    return { proven, revoked };
  }

  private directionCompatible(
    record: { capabilities: { contractType: string }[] },
    direction: ContractDirection,
  ): boolean {
    return record.capabilities.some((c) => c.contractType === direction);
  }

  private isRevoked(symbol: string, direction: ContractDirection, expiry: ExpirySeconds): boolean {
    return this.revoked.get(symbol)?.get(expiry)?.has(direction) === true;
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
      for (const proven of record.provenExpiries) {
        for (const direction of proven.directions) {
          // Both contract-compatible AND proven for this exact direction.
          if (!this.directionCompatible(record, direction)) continue;
          if (this.isRevoked(symbol, direction, proven.expiry)) continue;
          const key = `${symbol}|${direction}|${String(proven.expiry)}|${this.config.scannerProbeCurrency}|${this.config.scannerProbeBasis}|${String(this.config.scannerProbeAmount)}`;
          const cached = this.quotes.get(key);
          out.push({
            assumptions: this.probeAssumptions(symbol, direction, proven.expiry),
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
      for (const proven of record.provenExpiries) {
        for (const direction of proven.directions) {
          if (this.isRevoked(symbol, direction, proven.expiry)) continue;
          const expiry = proven.expiry;
          const key = `${symbol}|${direction}|${String(expiry)}|${this.config.scannerProbeCurrency}|${this.config.scannerProbeBasis}|${String(this.config.scannerProbeAmount)}`;
          const cached = this.quotes.get(key);
          snapshots.push(
            summarizeFreshness(
              {
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
              },
              {
                registryTtlMs: this.config.scannerRegistryTtlMs,
                capabilityTtlMs: this.config.scannerCapabilityTtlMs,
                proposalTtlMs: this.config.scannerProposalTtlMs,
                skewToleranceSeconds: this.config.scannerSkewToleranceS,
              },
            ),
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
      // Exact-direction gating (R2): never CALL || PUT.
      const contractAvailable =
        record?.capabilities.some((c) => c.contractType === snapshot.direction) === true;
      const result = eligibilityFromSnapshot(
        snapshot,
        cached?.quote ?? null,
        {
          marketActive: record?.state === "ACTIVE_ELIGIBLE",
          contractAvailable,
          expirySupported:
            this.registry.isProven(
              snapshot.underlyingSymbol,
              snapshot.direction,
              snapshot.expirySeconds,
            ) && !this.isRevoked(snapshot.underlyingSymbol, snapshot.direction, snapshot.expirySeconds),
          userBlocked: record?.state === "INACTIVE",
          apiHealthy: this.supervisor === null ? true : this.supervisor.getState() === "HEALTHY",
          threshold: this.config.scannerPayoutThreshold,
        },
      );
      opportunities.push({
        underlyingSymbol: snapshot.underlyingSymbol,
        direction: snapshot.direction,
        expirySeconds: snapshot.expirySeconds,
        proposalKey: cached?.quote.key ?? "",
        proposalId: cached?.quote.proposalId ?? null,
        effectivePayout: cached?.quote.effectivePayout ?? null,
        breakEven: cached?.quote.breakEven ?? null,
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
      for (const entry of record.provenExpiries) {
        for (const direction of entry.directions) {
          if (!this.isRevoked(record.instrument.underlyingSymbol, direction, entry.expiry)) {
            proven += 1;
          }
        }
      }
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
    // Symbol/expiry grouping for partition pruning (R6); direction stays in
    // row content. One file per populated partition per batch.
    const ticksBySymbol = new Map<string, TickRow[]>();
    for (const row of tickRows) {
      const group = ticksBySymbol.get(row.underlyingSymbol) ?? [];
      group.push(row);
      ticksBySymbol.set(row.underlyingSymbol, group);
    }
    const safeSymbol = (symbol: string): string =>
      symbol.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 64) || "unknown";
    for (const [symbol, rows] of [...ticksBySymbol.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      await insertTicks(connection, rows);
      const part = `ticks/date=${date}/symbol=${safeSymbol(symbol)}/part-${String(this.partCounter).padStart(4, "0")}.parquet`;
      const finalPath = join(this.captureRoot, part);
      await finalizeParquet(connection, "ticks", finalPath);
      files.push({ path: part, sha256: fileSha256(readFileSync(finalPath)), rows: rows.length });
      finalized += 1;
    }
    const proposalsByPartition = new Map<string, ProposalRow[]>();
    for (const row of proposalRows) {
      const key = `${row.underlyingSymbol}|${String(row.durationSeconds)}`;
      const group = proposalsByPartition.get(key) ?? [];
      group.push(row);
      proposalsByPartition.set(key, group);
    }
    for (const [key, rows] of [...proposalsByPartition.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const [symbol = "unknown", expiry = "0"] = key.split("|");
      await insertProposals(connection, rows);
      const part = `proposals/date=${date}/symbol=${safeSymbol(symbol)}/expiry_s=${expiry}/part-${String(this.partCounter).padStart(4, "0")}.parquet`;
      const finalPath = join(this.captureRoot, part);
      await finalizeParquet(connection, "proposals", finalPath);
      files.push({ path: part, sha256: fileSha256(readFileSync(finalPath)), rows: rows.length });
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
    lifecycle: RuntimeLifecycle;
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
      // Truthful liveness (R4): running lifecycle AND a live market stream
      // (HEALTHY supervisor, or any external subscription without one) AND
      // no disk stop. connect() alone, a disconnect, or stop() all read idle.
      captureActive:
        this.lifecycle === "running" &&
        !this.diskStopped &&
        (this.supervisor ? this.supervisor.getState() === "HEALTHY" : true) &&
        this.hub.externalCount() > 0,
      lifecycle: this.lifecycle,
    };
  }

  async stop(): Promise<void> {
    for (const timer of this.loopTimers) clearInterval(timer);
    this.loopTimers = [];
    this.lifecycle = "stopped";
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
