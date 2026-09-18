/**
 * Deriv Data & Scanner module wiring for the Trader Worker (DT-WP-02).
 * Builds budget, transport, supervisor, registry, tick hub, pulse scheduler
 * and read-only snapshots. Boot stays offline: nothing connects until
 * `connect()` is called explicitly (never at startup, never from a GET route).
 */
import WebSocket from "ws";
import { loadConfig, type AppConfig } from "@deriv-trader/config";
import type { ConnectionHealth } from "@deriv-trader/domain";
import {
  ApiBudgetManager,
  ConnectionSupervisor,
  DerivPublicMarketSource,
  PublicWsClient,
  type WsSocket,
} from "@deriv-trader/deriv-adapter";
import { SharedTickHub, SymbolRegistry } from "@deriv-trader/market-data";
import { buildOpportunity, evaluateEligibility, PayoutPulseScheduler } from "@deriv-trader/scanner";
import type { EligibilityState, Opportunity } from "@deriv-trader/scanner";
import { emptyCaptureSession, type CaptureSession } from "@deriv-trader/db";

export interface MarketModule {
  readonly budget: ApiBudgetManager;
  readonly client: PublicWsClient;
  readonly supervisor: ConnectionSupervisor;
  readonly source: DerivPublicMarketSource;
  readonly registry: SymbolRegistry;
  readonly hub: SharedTickHub;
  readonly pulse: PayoutPulseScheduler;
  session: CaptureSession;
  connect(): Promise<void>;
}

function socketFactory(url: string): WsSocket {
  return new WebSocket(url);
}

export function createMarketModule(config: AppConfig = loadConfig()): MarketModule {
  const budget = new ApiBudgetManager({
    proposal: { perMinute: config.budgetProposalPerMin, perHour: config.budgetProposalPerHour },
    other: { perMinute: config.budgetOtherPerMin, perHour: config.budgetOtherPerHour },
    proposalReserveFraction: config.budgetProposalReserve,
  });
  const client = new PublicWsClient(config.derivOptionsPublicWsUrl, {
    socketFactory,
    requestTimeoutMs: config.wsRequestTimeoutMs,
    connectionId: `public-${config.environment.toLowerCase()}`,
  });
  const source = new DerivPublicMarketSource(client, budget, { buildSha: config.buildSha });
  const registry = new SymbolRegistry(source);
  const hub = new SharedTickHub(source);
  const pulse = new PayoutPulseScheduler(budget, (assumptions) => source.requestProposal(assumptions), {
    threshold: config.scannerPayoutThreshold,
  });
  const supervisor = new ConnectionSupervisor({
    connect: () => client.connect(),
    restoreSubscriptions: () => registry.refreshSymbols().then(() => undefined),
    heartbeat: () =>
      client
        .request({ ping: 1 }, { timeoutMs: 5000 })
        .then(() => true)
        .catch(() => false),
    onInvalidate: () => {
      hub.invalidateAll();
    },
    baseDelayMs: config.wsReconnectBaseMs,
    maxDelayMs: config.wsReconnectMaxMs,
    heartbeatMs: config.wsHeartbeatMs,
  });
  const module: MarketModule = {
    budget,
    client,
    supervisor,
    source,
    registry,
    hub,
    pulse,
    session: emptyCaptureSession(`sess_${Date.now().toString(36)}`, `ds_${Date.now().toString(36)}`, config.buildSha),
    connect: async () => {
      await supervisor.start();
      if (supervisor.getState() === "HEALTHY") {
        await registry.refreshSymbols();
      }
    },
  };
  return module;
}

export interface MarketStatus {
  readonly connection: ConnectionHealth;
  readonly symbolsTotal: number;
  readonly eligibleSymbols: number;
  readonly externalSubscriptions: number;
  readonly staleSymbols: number;
}

export function marketStatus(module: MarketModule): MarketStatus {
  const records = module.registry.symbols();
  return {
    connection: module.supervisor.health(),
    symbolsTotal: records.length,
    eligibleSymbols: records.filter((r) => r.state === "ACTIVE_ELIGIBLE").length,
    externalSubscriptions: module.hub.externalCount(),
    staleSymbols: records.filter((r) => r.state === "STALE" || r.state === "ERROR").length,
  };
}

export interface ScannerStatus {
  readonly threshold: number;
  readonly proposalTtlMs: number;
  readonly reserveFraction: number;
  readonly proposalBudget: ReturnType<ApiBudgetManager["telemetry"]>;
}

export function scannerStatus(module: MarketModule, config: AppConfig): ScannerStatus {
  return {
    threshold: config.scannerPayoutThreshold,
    proposalTtlMs: config.scannerProposalTtlMs,
    reserveFraction: module.budget.getConfig().proposalReserveFraction,
    proposalBudget: module.budget.telemetry("proposal"),
  };
}

export interface OpportunitiesSnapshot {
  readonly generatedAt: string;
  readonly count: number;
  readonly eligible: number;
  readonly opportunities: Opportunity[];
}

/** Current-state lattice only: no queues, no stale blocked signals. */
export function opportunities(module: MarketModule, config: AppConfig): OpportunitiesSnapshot {
  const list: Opportunity[] = [];
  for (const record of module.registry.symbols()) {
    const tickFreshness = module.hub.freshness(record.instrument.underlyingSymbol, module.client.isConnected());
    for (const expiry of record.supportedExpiries) {
      const callCompatible = record.capabilities.some((c) => c.contractType === "CALL");
      const putCompatible = record.capabilities.some((c) => c.contractType === "PUT");
      list.push(
        buildOpportunity({
          underlyingSymbol: record.instrument.underlyingSymbol,
          expirySeconds: expiry,
          marketActive: record.state === "ACTIVE_ELIGIBLE",
          contractAvailable: callCompatible || putCompatible,
          expirySupported: true,
          tickFreshness,
          quote: null,
          quoteAgeMs: null,
          userBlocked: record.state === "INACTIVE",
          apiHealthy: module.supervisor.getState() === "HEALTHY",
          threshold: config.scannerPayoutThreshold,
          proposalTtlMs: config.scannerProposalTtlMs,
          callCompatible,
          putCompatible,
        }),
      );
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    count: list.length,
    eligible: list.filter((o) => o.eligibility === "ELIGIBLE").length,
    opportunities: list,
  };
}

export interface DataStatus {
  readonly session: CaptureSession;
  readonly capture: "idle" | "live";
  readonly diskWarnMb: number;
  readonly diskStopMb: number;
  readonly dqgFindings: number;
  readonly dqgBlocks: boolean;
}

export function dataStatus(module: MarketModule, config: AppConfig): DataStatus {
  return {
    session: module.session,
    capture: module.supervisor.getState() === "HEALTHY" ? "live" : "idle",
    diskWarnMb: config.diskWarnMb,
    diskStopMb: config.diskStopMb,
    dqgFindings: 0,
    dqgBlocks: false,
  };
}

export type { EligibilityState };
export { evaluateEligibility };
