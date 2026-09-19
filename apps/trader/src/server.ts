/**
 * Trader Worker service factory (DT-WP-01 Phase C).
 * Startup skeleton aligned to V1-STARTUP-SHUTDOWN:
 * config -> logging -> local paths -> adapters skeleton -> HTTP readiness.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig, isLoopbackHost, type AppConfig } from "@deriv-trader/config";
import type { HealthReport, ServiceState } from "@deriv-trader/domain";
import {
  createMarketModule,
  dataStatus,
  marketStatus,
  opportunities,
  scannerStatus,
  type MarketModule,
} from "./market.js";

export interface TraderServiceOptions {
  readonly config?: AppConfig;
  readonly logger?: boolean;
}

export interface TraderService {
  readonly app: FastifyInstance;
  readonly config: AppConfig;
  readonly startedAt: Date;
  readonly market: MarketModule;
  getState(): ServiceState;
  markReady(): void;
  close(): Promise<void>;
}

const VERSION = "0.1.0";

export function createTraderService(options: TraderServiceOptions = {}): TraderService {
  // 1. load app/build configuration
  const config = options.config ?? loadConfig();

  // 2. initialize logging (Fastify logger; JSON in production, pretty locally via boolean)
  const app = Fastify({ logger: options.logger ?? false });

  // 3. validate local data paths (deterministic, no capture yet)
  const dataRoot = config.dataRoot;

  // 4-8. adapters skeleton: auth/db/secret/risk placeholders are represented
  // by readiness flags only in WP-01. No Deriv socket/trading/order code.
  const mutable: { state: ServiceState } = { state: "STARTING" };
  const startedAt = new Date();

  const buildHealth = (): HealthReport => ({
    status:
      mutable.state === "READY"
        ? "HEALTHY"
        : mutable.state === "STARTING"
          ? "UNKNOWN"
          : "DEGRADED",
    serviceState: mutable.state,
    version: VERSION,
    buildSha: config.buildSha,
    environment: config.environment,
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
    checkedAt: new Date().toISOString(),
  });

  // 13. expose READY status via versioned health endpoint
  void app.get("/v1/health", () => buildHealth());

  void app.get("/v1/status", () => ({
    name: "trader-worker",
    version: VERSION,
    buildSha: config.buildSha,
    environment: config.environment,
    state: mutable.state,
    dataRoot,
    // Readiness without secrets: report whether optional integrations are configured,
    // never their values.
    integrations: {
      supabaseConfigured: config.supabaseUrl.length > 0,
      derivAppConfigured: config.derivAppId.length > 0,
    },
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
  }));

  // DT-WP-02: read-only market/data/scanner observability. The module boots
  // offline (no auto-connect); endpoints report current state honestly.
  const market: MarketModule = createMarketModule(config);

  void app.get("/v1/market/status", () => marketStatus(market));
  void app.get("/v1/scanner/status", () => scannerStatus(market));
  void app.get("/v1/scanner/opportunities", () => opportunities(market));
  void app.get("/v1/data/status", () => dataStatus(market));

  return {
    app,
    config,
    startedAt,
    market,
    getState: () => mutable.state,
    markReady: () => {
      mutable.state = "READY";
    },
    close: async () => {
      mutable.state = "STOPPING";
      await market.runtime.stop().catch(() => undefined);
      await market.client.close().catch(() => undefined);
      await app.close();
      mutable.state = "STOPPED";
    },
  };
}

/** Guard loopback binding before listen. */
export function assertLoopback(host: string): void {
  if (!isLoopbackHost(host)) {
    throw new Error(
      `refusing to bind non-loopback host "${host}" (V1-SECURITY-BOUNDARIES: loopback-only by default)`,
    );
  }
}

export async function startTraderService(
  options: TraderServiceOptions = {},
): Promise<TraderService> {
  const service = createTraderService(options);
  assertLoopback(service.config.traderHost);
  await service.app.listen({ host: service.config.traderHost, port: service.config.traderPort });
  await service.app.ready();
  service.markReady();
  return service;
}
