/**
 * Payout-aware Edge Gate (DT-WP-03 §5).
 * Pure economics: r = (P - A) / A, p_be = A / P, probability_edge and EV only
 * when a leakage-safe calibrated p_hat exists. Zero execution authority.
 */
import { breakEven, effectivePayout } from "@deriv-trader/domain";

export type EdgeVerdict = "PASS" | "FAIL" | "UNKNOWN";

export interface EdgeInput {
  readonly askPrice: number | null;
  readonly payout: number | null;
  /** Calibrated win probability, or null when uncalibrated/insufficient. */
  readonly pHat: number | null;
  readonly threshold: number;
  readonly safetyMargin: number;
}

export interface EdgeResult {
  readonly verdict: EdgeVerdict;
  readonly reasonCode: string;
  readonly effectivePayout: number | null;
  readonly pBe: number | null;
  readonly probabilityEdge: number | null;
  readonly evPerStake: number | null;
}

export function evaluateEdge(input: EdgeInput): EdgeResult {
  const effective = effectivePayout(input.askPrice, input.payout);
  const pBe = breakEven(input.askPrice, input.payout);
  if (effective === null || pBe === null) {
    return {
      verdict: "UNKNOWN",
      reasonCode: "ECONOMICS_UNKNOWN",
      effectivePayout: null,
      pBe: null,
      probabilityEdge: null,
      evPerStake: null,
    };
  }
  if (input.pHat === null || !Number.isFinite(input.pHat)) {
    return {
      verdict: "UNKNOWN",
      reasonCode: "UNCALIBRATED",
      effectivePayout: effective,
      pBe,
      probabilityEdge: null,
      evPerStake: null,
    };
  }
  const probabilityEdge = input.pHat - pBe;
  const evPerStake = input.pHat * effective - (1 - input.pHat);
  if (effective < input.threshold) {
    return {
      verdict: "FAIL",
      reasonCode: "PAYOUT_TOO_LOW",
      effectivePayout: effective,
      pBe,
      probabilityEdge,
      evPerStake,
    };
  }
  if (probabilityEdge < input.safetyMargin) {
    return {
      verdict: "FAIL",
      reasonCode: "EDGE_BELOW_MARGIN",
      effectivePayout: effective,
      pBe,
      probabilityEdge,
      evPerStake,
    };
  }
  return {
    verdict: "PASS",
    reasonCode: "EDGE_OK",
    effectivePayout: effective,
    pBe,
    probabilityEdge,
    evPerStake,
  };
}
