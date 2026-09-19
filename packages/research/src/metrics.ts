/**
 * Research metrics (DT-WP-03 §16).
 * Payout-aware expectancy with confidence intervals where economics are
 * known; directional-only summaries otherwise. No universal win-rate target.
 */
import type { SettledDecision } from "./replay.js";

export interface ProfileMetrics {
  readonly signals: number;
  readonly noSignal: number;
  readonly noSignalReasons: Record<string, number>;
  readonly wins: number;
  readonly losses: number;
  readonly flats: number;
  readonly unknowns: number;
  readonly hitRate: number | null;
  readonly hitRateCi: [number, number] | null;
  readonly avgEffectivePayout: number | null;
  readonly avgBreakEven: number | null;
  readonly expectancyPerStake: number | null;
  readonly expectancyCi: [number, number] | null;
  readonly monetary: boolean;
  readonly maxDrawdown: number;
  readonly longestLossRun: number;
  readonly profitFactor: number | null;
  readonly unknownFraction: number;
}

/** Wilson score interval for a hit rate. */
export function wilson(p: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const den = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / den;
  const delta = (z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, center - delta), Math.min(1, center + delta)];
}

/** Normal-approximation CI for a mean (documented approximation). */
export function meanCi(values: number[], z = 1.96): [number, number] | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  const half = (z * Math.sqrt(variance)) / Math.sqrt(values.length);
  return [mean - half, mean + half];
}

/**
 * Payout-haircut stress (research robustness probe, not a prediction).
 * Recomputes per-stake expectancy as if every win paid (1 - haircut) less:
 * realized' = won ? effectivePayout * (1 - haircut) : -1. FLAT/UNKNOWN
 * contribute 0. Null when no monetary evidence exists.
 */
export function stressedExpectancy(
  decisions: readonly SettledDecision[],
  haircut: number,
): number | null {
  const stressed: number[] = [];
  for (const decision of decisions) {
    if (decision.signal === "NO_SIGNAL" || decision.label === "UNKNOWN" || decision.label === "FLAT") {
      continue;
    }
    if (decision.effectivePayout === null) continue;
    const won =
      (decision.signal === "SIGNAL_CALL" && decision.label === "UP") ||
      (decision.signal === "SIGNAL_PUT" && decision.label === "DOWN");
    stressed.push(won ? decision.effectivePayout * (1 - haircut) : -1);
  }
  if (stressed.length === 0) return null;
  return stressed.reduce((a, b) => a + b, 0) / stressed.length;
}

export function computeMetrics(
  decisions: readonly SettledDecision[],
  payouts: readonly (number | null)[],
  breakEvens: readonly (number | null)[],
): ProfileMetrics {
  const noSignalReasons: Record<string, number> = {};
  let signals = 0;
  let wins = 0;
  let losses = 0;
  let flats = 0;
  let unknowns = 0;
  const realized: number[] = [];
  const knownPayouts: number[] = [];
  const knownBes: number[] = [];
  for (let i = 0; i < decisions.length; i += 1) {
    const decision = decisions[i];
    if (!decision) continue;
    if (decision.signal === "NO_SIGNAL") {
      const key = decision.reason || "unknown";
      noSignalReasons[key] = (noSignalReasons[key] ?? 0) + 1;
      continue;
    }
    signals += 1;
    if (decision.label === "UNKNOWN") {
      unknowns += 1;
      continue;
    }
    if (decision.label === "FLAT") {
      flats += 1;
      continue;
    }
    const won =
      (decision.signal === "SIGNAL_CALL" && decision.label === "UP") ||
      (decision.signal === "SIGNAL_PUT" && decision.label === "DOWN");
    if (won) wins += 1;
    else losses += 1;
    if (decision.realized !== null) realized.push(decision.realized);
    const payout = payouts[i] ?? null;
    const be = breakEvens[i] ?? null;
    if (payout !== null && be !== null && decision.realized !== null) {
      knownPayouts.push(payout);
      knownBes.push(be);
    }
  }
  const resolved = wins + losses;
  const hitRate = resolved === 0 ? null : wins / resolved;
  // Monetary expectancy only when realized P&L exists (proposal-aware).
  const monetary = realized.length > 0;
  const expectancy = monetary ? realized.reduce((a, b) => a + b, 0) / realized.length : null;
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let lossRun = 0;
  let longestLossRun = 0;
  let grossWin = 0;
  let grossLoss = 0;
  const curveSource = monetary ? realized : [];
  for (const pnl of curveSource) {
    equity += pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    if (pnl > 0) grossWin += pnl;
    else if (pnl < 0) grossLoss += -pnl;
    if (pnl < 0) {
      lossRun += 1;
      longestLossRun = Math.max(longestLossRun, lossRun);
    } else {
      lossRun = 0;
    }
  }
  return {
    signals,
    noSignal: decisions.length - signals,
    noSignalReasons,
    wins,
    losses,
    flats,
    unknowns,
    hitRate,
    hitRateCi: hitRate === null ? null : wilson(hitRate, resolved),
    avgEffectivePayout:
      knownPayouts.length === 0 ? null : knownPayouts.reduce((a, b) => a + b, 0) / knownPayouts.length,
    avgBreakEven: knownBes.length === 0 ? null : knownBes.reduce((a, b) => a + b, 0) / knownBes.length,
    expectancyPerStake: expectancy,
    expectancyCi: monetary ? meanCi(realized) : null,
    monetary,
    maxDrawdown,
    longestLossRun,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Number.POSITIVE_INFINITY : null) : grossWin / grossLoss,
    unknownFraction: signals === 0 ? 0 : unknowns / signals,
  };
}
