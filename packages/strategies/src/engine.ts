/**
 * Common Strategy Engine contract, extended (DT-WP-03 §6).
 * Deterministic input → SIGNAL_CALL / SIGNAL_PUT / NO_SIGNAL with full
 * provenance. Stale/gapped/untrusted input, insufficient history, unsupported
 * expiry or uncalibrated evidence safely produce NO_SIGNAL / UNKNOWN.
 */
import type {
  DecisionSignal,
  ExpirySeconds,
  ProposalQuote,
  RunnerIdentity,
} from "@deriv-trader/domain";
import type { FeatureSnapshot } from "./features.js";

export interface StrategyInput {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly runnerId: string;
  readonly runner: RunnerIdentity;
  readonly instrument: string;
  readonly expirySeconds: ExpirySeconds;
  readonly decisionTime: string;
  readonly decisionTimeMs: number;
  readonly features: FeatureSnapshot;
  readonly provenance: string;
  readonly proposal: ProposalQuote | null;
  readonly proposalAgeMs: number | null;
  readonly presetVersion: string;
  readonly configVersion: string;
}

export interface StrategyOutput {
  readonly signal: DecisionSignal;
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly runnerId: string;
  readonly instrument: string;
  readonly expirySeconds: ExpirySeconds;
  readonly timestamp: string;
  readonly featureHash: string;
  /** Heuristic internal quality 0..1 — NEVER a probability unless calibrated. */
  readonly quality: number;
  /** Calibrated win probability, only when leakage-safe calibration exists. */
  readonly pHat: number | null;
  readonly pBe: number | null;
  readonly edge: number | null;
  readonly evPerStake: number | null;
  readonly reason: string;
  readonly noSignalCode: string | null;
  readonly presetVersion: string;
  readonly configVersion: string;
}

export function noSignal(  input: StrategyInput,
  code: string,
  reason: string,
): StrategyOutput {
  return {
    signal: "NO_SIGNAL",
    strategyId: input.strategyId,
    strategyVersion: input.strategyVersion,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: 0,
    pHat: null,
    pBe: null,
    edge: null,
    evPerStake: null,
    reason,
    noSignalCode: code,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}

export interface QuantitativeEngine {
  readonly strategyId: string;
  readonly strategyVersion: string;
  evaluate(input: StrategyInput): StrategyOutput;
}

/** Break-even from an optional proposal; null when economics absent. */
export function pBeOf(proposal: StrategyInput["proposal"]): number | null {
  if (!proposal) return null;
  const { payout, askPrice } = proposal;
  if (!payout || !askPrice) return null;
  return askPrice / payout;
}
