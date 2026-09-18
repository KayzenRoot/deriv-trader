/**
 * Deriv adapter boundary (DT-WP-01 Phase F).
 * Future interfaces only. No network calls, no broker execution here.
 */
import type { Environment } from "@deriv-trader/domain";

export interface DerivAdapterConfig {
  readonly appId: string;
  readonly apiUrl: string;
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
