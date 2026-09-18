/**
 * Deriv public Options API adapter (DT-WP-02).
 * Typed transport, supervisor, budget, schemas and normalization behind one
 * boundary. Read-only: active_symbols, contracts_for, ticks, ticks_history,
 * proposal (quote only), forget/forget_all. No buy/sell/authenticated paths.
 */
import type { Environment } from "@deriv-trader/domain";

export const DERIV_OPTIONS_REST_BASE_URL_DEFAULT = "https://api.derivws.com";

export const DERIV_OPTIONS_PUBLIC_WS_URL_DEFAULT =
  "wss://api.derivws.com/trading/v1/options/ws/public";

export interface DerivAdapterConfig {
  readonly appId: string;
  readonly restBaseUrl: string;
  readonly publicWsUrl: string;
  readonly environment: Environment;
}

export interface NormalizedTick {
  readonly symbol: string;
  readonly epoch: number;
  readonly quote: number;
}

export interface DerivAdapter {
  readonly name: "deriv-adapter";
  describe(): string;
}

export class NullDerivAdapter implements DerivAdapter {
  readonly name = "deriv-adapter" as const;
  describe(): string {
    return "deriv-adapter foundation skeleton (no network)";
  }
}

export { SCHEMA_VERSION } from "./normalize.js";
export { coerceNumber } from "./normalize.js";
export { PublicWsClient } from "./transport.js";
export type { SocketFactory, WsSocket, TransportOptions } from "./transport.js";
export { ConnectionSupervisor } from "./supervisor.js";
export type { SupervisorHooks } from "./supervisor.js";
export { ApiBudgetManager, DEFAULT_BUDGET, BUDGET_DEFAULTS_VERSION } from "./budget.js";
export type {
  BudgetClass,
  BudgetConfig,
  BudgetGroup,
  BudgetTelemetry,
  BudgetWindow,
} from "./budget.js";
export { mapBrokerError, extractErrorParts } from "./errors.js";
export type { NormalizedBrokerError } from "./errors.js";
export { DerivPublicMarketSource } from "./source.js";
export type { MarketSourceOptions } from "./source.js";
