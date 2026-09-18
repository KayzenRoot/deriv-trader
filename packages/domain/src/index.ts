/**
 * Deriv Trader V1 domain vocabulary (DT-WP-01 Phase B).
 * Broker-agnostic where possible. No economic order implementation lives here.
 */

/** Product environment. REAL is represented but not enabled for execution in WP-01. */
export type Environment = "DEMO" | "REAL";

/** Opaque branded IDs keep user/worker references type-safe without leaking shape. */
export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type UserId = Brand<string, "UserId">;
export type WorkerId = Brand<string, "WorkerId">;
export type StrategyId = Brand<string, "StrategyId">;
export type RunnerId = Brand<string, "RunnerId">;
export type OrderId = Brand<string, "OrderId">;
export type EventId = Brand<string, "EventId">;
export type ExecutionProfileId = Brand<string, "ExecutionProfileId">;

export function userId(value: string): UserId {
  return value as UserId;
}

export function runnerId(value: string): RunnerId {
  return value as RunnerId;
}

/**
 * Runner identity model: one Runner = one strategy family + one expiry profile
 * + one execution profile identity (ADR-0011).
 */
export interface RunnerIdentity {
  readonly strategyId: StrategyId;
  readonly expirySeconds: ExpirySeconds;
  readonly executionProfile: ExecutionProfileId;
}

/** V1 expiry profiles are constrained to 60/180/300 seconds. */
export type ExpirySeconds = 60 | 180 | 300;

export const EXPIRY_SECONDS: readonly ExpirySeconds[] = [60, 180, 300];

export function isExpirySeconds(value: unknown): value is ExpirySeconds {
  return value === 60 || value === 180 || value === 300;
}

/** Decision output vocabulary. NO_SIGNAL is first-class. */
export type DecisionSignal = "SIGNAL_CALL" | "SIGNAL_PUT" | "NO_SIGNAL";

export const DECISION_SIGNALS: readonly DecisionSignal[] = [
  "SIGNAL_CALL",
  "SIGNAL_PUT",
  "NO_SIGNAL",
];

/** Extensible reason-code primitives for risk/admission/result paths. */
export type RiskReasonCode =
  | "RISK_OK"
  | "RISK_BLOCKED_EXPOSURE"
  | "RISK_BLOCKED_DAILY_LOSS"
  | "RISK_BLOCKED_SLOT_FULL"
  | "RISK_BLOCKED_COOLDOWN"
  | "RISK_BLOCKED_STREAK"
  | "RISK_BLOCKED_AMBIGUOUS_STATE"
  | "RISK_UNKNOWN";

export type AdmissionReasonCode =
  | "ADMIT_OK"
  | "ADMIT_REJECTED_RISK"
  | "ADMIT_REJECTED_NO_SIGNAL"
  | "ADMIT_REJECTED_STALE_MARKET"
  | "ADMIT_REJECTED_BUDGET"
  | "ADMIT_UNKNOWN";

export type ResultReasonCode =
  | "RESULT_WIN"
  | "RESULT_LOSS"
  | "RESULT_VOID"
  | "RESULT_RECONCILED"
  | "RESULT_UNKNOWN";

/** Health status and service-state contracts. */
export type HealthStatus = "HEALTHY" | "DEGRADED" | "BLOCKED" | "UNKNOWN";
export type ServiceState =
  | "STARTING"
  | "READY"
  | "DEGRADED"
  | "BLOCKED"
  | "STOPPING"
  | "STOPPED";

export interface HealthReport {
  readonly status: HealthStatus;
  readonly serviceState: ServiceState;
  readonly version: string;
  readonly buildSha: string;
  readonly environment: Environment;
  readonly uptimeSeconds: number;
  readonly checkedAt: string;
}

/** Canonical event envelope fields used across worker/persistence. */
export interface EventEnvelope<TType extends string = string, TPayload = unknown> {
  readonly eventId: EventId;
  readonly eventType: TType;
  readonly schemaVersion: SchemaVersion;
  readonly occurredAt: string;
  readonly correlationId?: string | undefined;
  readonly causationId?: string | undefined;
  readonly userId?: UserId | undefined;
  readonly workerId?: WorkerId | undefined;
  readonly executionProfile?: ExecutionProfileId | undefined;
  readonly runnerId?: RunnerId | undefined;
  readonly orderId?: OrderId | undefined;
  readonly buildSha: string;
  readonly payload: TPayload;
}

/** Configuration / schema version primitives. */
export type SchemaVersion = Brand<string, "SchemaVersion">;

export const EVENT_SCHEMA_VERSION = "1.0.0" as SchemaVersion;
export const CONFIG_SCHEMA_VERSION = "1.0.0" as SchemaVersion;

export function schemaVersion(value: string): SchemaVersion {
  return value as SchemaVersion;
}

export type {
  BrokerErrorCategory,
  RetryClass,
} from "./errors.js";
export { retryClassFor, safeMessageFor } from "./errors.js";

export type {
  ActiveInstrument,
  ContractCapability,
  MarketTick,
  ContractDirection,
  ProposalAssumptions,
  ProposalState,
  ProposalQuote,
  ConnectionState,
  ConnectionHealth,
  MarketDataSource,
  Clock,
} from "./market.js";
export {
  EFFECTIVE_PAYOUT_THRESHOLD,
  effectivePayout,
  breakEven,
  proposalKey,
  systemClock,
} from "./market.js";
