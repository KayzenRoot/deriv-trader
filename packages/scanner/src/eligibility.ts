/**
 * Eligibility Engine + Opportunity Lattice (DT-WP-02 Phase E).
 * Deterministic eligibility states. Eligibility is NOT a trading signal and
 * no direction-selection logic lives here.
 */
import type { ExpirySeconds, ProposalQuote } from "@deriv-trader/domain";
import { EFFECTIVE_PAYOUT_THRESHOLD } from "@deriv-trader/domain";
import type { FreshnessSnapshot, FreshnessState } from "@deriv-trader/market-data";

export type EligibilityState =
  | "ELIGIBLE"
  | "PAYOUT_TOO_LOW"
  | "UNSUPPORTED_EXPIRY"
  | "UNSUPPORTED_CONTRACT"
  | "MARKET_INACTIVE"
  | "TICK_STALE"
  | "PROPOSAL_STALE"
  | "USER_BLOCKED"
  | "API_DEGRADED"
  | "UNKNOWN_FAIL_CLOSED";

export interface EligibilityInput {
  readonly underlyingSymbol: string;
  readonly expirySeconds: ExpirySeconds;
  readonly marketActive: boolean;
  readonly contractAvailable: boolean;
  readonly expirySupported: boolean;
  readonly tickFreshness: FreshnessState;
  readonly quote: ProposalQuote | null;
  readonly quoteAgeMs: number | null;
  readonly userBlocked: boolean;
  readonly apiHealthy: boolean;
  readonly threshold?: number;
  readonly proposalTtlMs?: number;
}

export interface EligibilityResult {
  readonly state: EligibilityState;
  readonly reason: string;
}

const DEFAULT_PROPOSAL_TTL_MS = 30_000;

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const threshold = input.threshold ?? EFFECTIVE_PAYOUT_THRESHOLD;
  const ttl = input.proposalTtlMs ?? DEFAULT_PROPOSAL_TTL_MS;
  if (input.userBlocked) {
    return { state: "USER_BLOCKED", reason: `${input.underlyingSymbol} blocked by user filter` };
  }
  if (!input.apiHealthy) {
    return { state: "API_DEGRADED", reason: "broker capability degraded" };
  }
  if (!input.marketActive) {
    return { state: "MARKET_INACTIVE", reason: `${input.underlyingSymbol} market inactive` };
  }
  if (!input.contractAvailable) {
    return {
      state: "UNSUPPORTED_CONTRACT",
      reason: `${input.underlyingSymbol} CALL/PUT unavailable`,
    };
  }
  if (!input.expirySupported) {
    return {
      state: "UNSUPPORTED_EXPIRY",
      reason: `${String(input.expirySeconds)}s not proven for ${input.underlyingSymbol}`,
    };
  }
  if (
    input.tickFreshness === "STALE" ||
    input.tickFreshness === "GAPPED" ||
    input.tickFreshness === "UNTRUSTED"
  ) {
    return {
      state: "TICK_STALE",
      reason: `tick ${input.tickFreshness.toLowerCase()} for ${input.underlyingSymbol}`,
    };
  }
  if (
    !input.quote ||
    input.quote.state !== "KNOWN" ||
    input.quote.effectivePayout === null ||
    input.quoteAgeMs === null ||
    input.quoteAgeMs > ttl
  ) {
    return { state: "PROPOSAL_STALE", reason: `proposal unknown or stale for ${input.underlyingSymbol}` };
  }
  if (input.quote.effectivePayout < threshold) {
    return {
      state: "PAYOUT_TOO_LOW",
      reason: `effective payout ${input.quote.effectivePayout.toFixed(3)} below ${threshold.toFixed(2)}`,
    };
  }
  return { state: "ELIGIBLE", reason: `${input.underlyingSymbol} eligible` };
}

export interface OpportunityInput extends EligibilityInput {
  readonly callCompatible: boolean;
  readonly putCompatible: boolean;
}

/**
 * Eligibility from the assembled freshness authority (F7). The candidate's
 * tick freshness is the snapshot's overall verdict — never reconstructed
 * from partial signals here. Trust/proposal state also flow from the
 * snapshot; market/contract/expiry/user/api gates stay explicit inputs.
 */
export function eligibilityFromSnapshot(
  snapshot: FreshnessSnapshot,
  quote: ProposalQuote | null,
  quoteAgeMs: number | null,
  gates: {
    readonly marketActive: boolean;
    readonly contractAvailable: boolean;
    readonly expirySupported: boolean;
    readonly userBlocked: boolean;
    readonly apiHealthy: boolean;
    readonly threshold?: number;
    readonly proposalTtlMs?: number;
  },
): EligibilityResult {
  return evaluateEligibility({
    underlyingSymbol: snapshot.underlyingSymbol,
    expirySeconds: snapshot.expirySeconds,
    marketActive: gates.marketActive,
    contractAvailable: gates.contractAvailable,
    expirySupported: gates.expirySupported,
    tickFreshness: snapshot.overall,
    quote,
    quoteAgeMs,
    userBlocked: gates.userBlocked,
    apiHealthy: gates.apiHealthy,
    ...(gates.threshold === undefined ? {} : { threshold: gates.threshold }),
    ...(gates.proposalTtlMs === undefined ? {} : { proposalTtlMs: gates.proposalTtlMs }),
  });
}

export interface Opportunity {
  readonly underlyingSymbol: string;
  readonly expirySeconds: ExpirySeconds;
  readonly callCompatible: boolean;
  readonly putCompatible: boolean;
  readonly effectivePayout: number | null;
  readonly freshness: FreshnessState;
  readonly eligibility: EligibilityState;
  readonly blockerReason: string;
}

export function buildOpportunity(input: OpportunityInput): Opportunity {
  const result = evaluateEligibility(input);
  return {
    underlyingSymbol: input.underlyingSymbol,
    expirySeconds: input.expirySeconds,
    callCompatible: input.callCompatible,
    putCompatible: input.putCompatible,
    effectivePayout: input.quote?.effectivePayout ?? null,
    freshness: input.tickFreshness,
    eligibility: result.state,
    blockerReason: result.state === "ELIGIBLE" ? "" : result.reason,
  };
}
