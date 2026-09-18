/**
 * Scanner package entry (DT-WP-02).
 * Eligibility engine, opportunity lattice and payout pulse. No strategy
 * direction logic. Legacy scan shapes kept for compatibility.
 */
import type { ExpirySeconds } from "@deriv-trader/domain";
import type { Tick } from "@deriv-trader/market-data";

export interface ScanRequest {
  readonly symbol: string;
  readonly expirySeconds: ExpirySeconds;
  readonly at: string;
}

export type ScannerVerdict = "ELIGIBLE" | "INELIGIBLE" | "STALE_DATA";

export interface ScanResult {
  readonly request: ScanRequest;
  readonly verdict: ScannerVerdict;
  readonly reason: string;
  readonly tick: Tick | null;
}

export function ineligible(request: ScanRequest, reason: string): ScanResult {
  return { request, verdict: "INELIGIBLE", reason, tick: null };
}

export { PayoutPulseScheduler, DEFAULT_PULSE_CONFIG } from "./pulse.js";
export type { PulseBudget, PulseCandidate, PulseConfig, PulsePriority } from "./pulse.js";
export { evaluateEligibility, buildOpportunity } from "./eligibility.js";
export type {
  EligibilityInput,
  EligibilityResult,
  EligibilityState,
  Opportunity,
  OpportunityInput,
} from "./eligibility.js";
