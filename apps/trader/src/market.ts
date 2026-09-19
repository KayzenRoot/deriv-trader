/**
 * Trader worker market module (DT-WP-02, corrected).
 * Builds one MarketScannerRuntime (offline boot, explicit connect) and
 * exposes truthful read-only snapshots. No auto-connect at startup, no
 * network from GET routes, no secrets in any payload.
 */
import WebSocket from "ws";
import { loadConfig, type AppConfig } from "@deriv-trader/config";
import {
  ApiBudgetManager,
  DerivPublicMarketSource,
  PublicWsClient,
  type WsSocket,
} from "@deriv-trader/deriv-adapter";
import { MarketScannerRuntime } from "./runtime.js";
import type { OpportunitiesSnapshot } from "./runtime.js";

export interface MarketModule {
  readonly runtime: MarketScannerRuntime;
  readonly budget: ApiBudgetManager;
  readonly client: PublicWsClient;
  readonly source: DerivPublicMarketSource;
  connect(): Promise<void>;
}

function socketFactory(url: string): WsSocket {
  return new WebSocket(url);
}

export function createMarketModule(config: AppConfig = loadConfig()): MarketModule {
  const budget = new ApiBudgetManager(
    {
      proposal: { perMinute: config.budgetProposalPerMin, perLong: config.budgetProposalPerHour, longWindowMs: 3600_000 },
      other: { perMinute: config.budgetOtherPerMin, perLong: config.budgetOtherPerHour, longWindowMs: 3600_000 },
      rest: { perMinute: config.budgetRestPerMin, perLong: config.budgetRestPer10Min, longWindowMs: 600_000 },
      proposalReserveFraction: config.budgetProposalReserve,
    },
  );
  const client = new PublicWsClient(config.derivOptionsPublicWsUrl, {
    socketFactory,
    requestTimeoutMs: config.wsRequestTimeoutMs,
    connectionId: `public-${config.environment.toLowerCase()}`,
  });
  const source = new DerivPublicMarketSource(client, budget, { buildSha: config.buildSha });
  const runtime = new MarketScannerRuntime({
    config,
    source,
    budget,
    transport: {
      client,
      onDisconnect: (listener) => {
        client.onConnectionChange((connected) => {
          if (!connected) listener();
        });
      },
    },
  });
  return {
    runtime,
    budget,
    client,
    source,
    connect: () => runtime.connect(),
  };
}

export function marketStatus(module: MarketModule): ReturnType<MarketScannerRuntime["statusMarket"]> {
  return module.runtime.statusMarket();
}

export function scannerStatus(module: MarketModule): ReturnType<MarketScannerRuntime["statusScanner"]> {
  return module.runtime.statusScanner();
}

export function opportunities(module: MarketModule): OpportunitiesSnapshot {
  return module.runtime.lattice();
}

export function dataStatus(module: MarketModule): ReturnType<MarketScannerRuntime["statusData"]> {
  return module.runtime.statusData();
}
