/**
 * Deriv adapter boundary (DT-WP-01 Phase F).
 * Future interfaces only. No network calls, no broker execution here.
 * Endpoints follow the current Deriv Options API: public REST + public
 * WebSocket are explicit configuration; authenticated demo/real sockets are
 * obtained at runtime from the account OTP response and never hardcoded.
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
