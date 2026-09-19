/**
 * Market Freshness Matrix snapshots (DT-WP-02 Phase E, F7).
 * One auditable record per symbol + contract direction + expiry combining
 * registry age/state, capability age/state, tick age/continuity, proposal
 * age/state, connection epoch/health, clock skew and trust. Eligibility
 * consumes these snapshots instead of rebuilding partial semantics.
 */
import type { ExpirySeconds } from "@deriv-trader/domain";
import type { FreshnessState } from "./ticks.js";

export type ContinuityState = "continuous" | "gapped" | "invalidated" | "none";
export type SkewState = "ok" | "suspect" | "unknown";

/**
 * Operational TTL/tolerance policy (R3). Defaults are runtime tuning, not
 * trading-edge assumptions; all values are configurable via AppConfig.
 */
export interface FreshnessPolicy {
  readonly registryTtlMs: number;
  readonly capabilityTtlMs: number;
  readonly skewToleranceSeconds: number;
}

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  registryTtlMs: 30 * 60_000,
  capabilityTtlMs: 15 * 60_000,
  skewToleranceSeconds: 60,
};

export interface FreshnessSnapshot {
  readonly underlyingSymbol: string;
  readonly direction: "CALL" | "PUT";
  readonly expirySeconds: ExpirySeconds;
  readonly registryAgeMs: number | null;
  readonly registryState: string;
  readonly capabilityAgeMs: number | null;
  readonly capabilityState: string;
  readonly tickAgeMs: number | null;
  readonly tickState: FreshnessState;
  readonly continuity: ContinuityState;
  readonly proposalAgeMs: number | null;
  readonly proposalKnown: boolean;
  readonly connectionEpoch: number;
  readonly connectionHealthy: boolean;
  readonly skewSeconds: number | null;
  readonly skewState: SkewState;
  readonly trusted: boolean;
  /** Authority flags consumed directly by eligibility (fail closed). */
  readonly registryStale: boolean;
  readonly capabilityStale: boolean;
  readonly skewSuspect: boolean;
  /** Assembled authority: the single freshness verdict for this candidate. */
  readonly overall: FreshnessState;
}

export interface SnapshotInput {
  readonly underlyingSymbol: string;
  readonly direction: "CALL" | "PUT";
  readonly expirySeconds: ExpirySeconds;
  readonly registryAgeMs: number | null;
  readonly registryState: string;
  readonly capabilityAgeMs: number | null;
  readonly capabilityState: string;
  readonly tickAgeMs: number | null;
  readonly tickState: FreshnessState;
  readonly invalidated: boolean;
  readonly gapped: boolean;
  readonly proposalAgeMs: number | null;
  readonly proposalKnown: boolean;
  readonly connectionEpoch: number;
  readonly connectionHealthy: boolean;
  readonly skewSeconds: number | null;
  readonly trusted: boolean;
}

export function summarizeFreshness(
  input: SnapshotInput,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): FreshnessSnapshot {
  const continuity: ContinuityState = input.invalidated
    ? "invalidated"
    : input.gapped
      ? "gapped"
      : input.tickAgeMs === null
        ? "none"
        : "continuous";
  const skewSuspect =
    input.skewSeconds !== null && input.skewSeconds > policy.skewToleranceSeconds;
  const skewState: SkewState = input.skewSeconds === null ? "unknown" : skewSuspect ? "suspect" : "ok";
  const registryStale = input.registryAgeMs === null || input.registryAgeMs > policy.registryTtlMs;
  const capabilityStale =
    input.capabilityAgeMs === null || input.capabilityAgeMs > policy.capabilityTtlMs;
  let overall: FreshnessState;
  if (!input.trusted) {
    overall = "UNTRUSTED";
  } else if (!input.connectionHealthy || input.invalidated) {
    overall = "STALE";
  } else if (input.gapped) {
    overall = "GAPPED";
  } else if (skewSuspect || registryStale || capabilityStale) {
    overall = "STALE";
  } else if (input.tickState === "STALE" || input.tickState === "UNTRUSTED") {
    overall = "STALE";
  } else if (input.tickState === "GAPPED") {
    overall = "GAPPED";
  } else if (input.tickState === "AGING") {
    overall = "AGING";
  } else {
    overall = "FRESH";
  }
  return {
    underlyingSymbol: input.underlyingSymbol,
    direction: input.direction,
    expirySeconds: input.expirySeconds,
    registryAgeMs: input.registryAgeMs,
    registryState: input.registryState,
    capabilityAgeMs: input.capabilityAgeMs,
    capabilityState: input.capabilityState,
    tickAgeMs: input.tickAgeMs,
    tickState: input.tickState,
    continuity,
    proposalAgeMs: input.proposalAgeMs,
    proposalKnown: input.proposalKnown,
    connectionEpoch: input.connectionEpoch,
    connectionHealthy: input.connectionHealthy,
    skewSeconds: input.skewSeconds,
    skewState,
    trusted: input.trusted,
    registryStale,
    capabilityStale,
    skewSuspect,
    overall,
  };
}
