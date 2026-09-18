/**
 * Connection metadata boundary (DT-WP-01 Phase E).
 * Domain interfaces only — no real broker calls.
 */
import type { Environment, UserId } from "@deriv-trader/domain";

export type ConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED_DEMO"
  | "CONNECTED_REAL"
  | "ERROR";

export interface DerivConnectionMeta {
  readonly userId: UserId;
  readonly appId: string;
  readonly environment: Environment;
  readonly status: ConnectionStatus;
  readonly lastCheckedAt: string | null;
}

export interface DerivConnectionConfig {
  readonly appId: string;
  readonly restBaseUrl: string;
  readonly publicWsUrl: string;
  readonly environment: Environment;
}

export function describeConnection(meta: DerivConnectionMeta): string {
  return `${meta.environment}:${meta.status}`;
}

export function isConnected(meta: DerivConnectionMeta): boolean {
  return meta.status === "CONNECTED_DEMO" || meta.status === "CONNECTED_REAL";
}
