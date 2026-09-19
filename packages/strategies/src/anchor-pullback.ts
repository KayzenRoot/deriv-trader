/**
 * Strategy 4 — Anchor Pullback: trend pullback to the Adaptive Price Anchor.
 * Enters only on validated resumption toward the trend. Never claims true
 * VWAP: the anchor is an explicitly named EMA/TWAP-like level (no volume).
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf, preflight } from "./engine.js";

export const STRATEGY_ID = "anchor_pullback";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  minTrendSlope: z.number().positive().default(0.0002),
  minPersistence: z.number().min(0).max(1).default(0.35),
  minPullbackDepth: z.number().min(0).default(0.0005),
  maxPullbackDepth: z.number().positive().default(0.006),
  maxVolatility: z.number().positive().default(0.01),
});

export type AnchorPullbackPreset = z.infer<typeof presetSchema>;

export function decideAnchorPullback(
  input: StrategyInput,
  preset: AnchorPullbackPreset,
): StrategyOutput {
  const blocked = preflight(input);
  if (blocked) return blocked;
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "ANOMALOUS_DATA", "anomalous input rejected");
  // Trend is judged over the long (50-tick) slope so a short pullback dip
  // cannot flatten the trend reading; displacement is measured from the
  // recent extreme; resumption on the short (10-tick) slope.
  const trendSlope = v["slope_50"] ?? 0;
  if (Math.abs(trendSlope) < preset.minTrendSlope) {
    return noSignal(input, "NO_TREND", "no established trend");
  }
  const trendDir = Math.sign(trendSlope);
  if ((v["persistence_20"] ?? 0) * trendDir < preset.minPersistence) {
    return noSignal(input, "BROKEN_TREND", "trend persistence failed");
  }
  if ((v["volatility_20"] ?? 0) > preset.maxVolatility) {
    return noSignal(input, "VOLATILITY_REGIME", "volatility regime unsuitable");
  }
  // Trend value must hold: price must not break below the slow anchor by
  // more than the deepest tolerable pullback — otherwise the trend itself
  // is broken, not pulling back.
  const anchorDistance = v["anchor_distance"] ?? 0;
  if (anchorDistance * trendDir < -preset.maxPullbackDepth) {
    return noSignal(input, "BROKEN_TREND", "price broke trend anchor value");
  }
  // Pullback depth is the excursion from the recent extreme (not from the
  // lagging anchor): a controlled dip with room left to resume.
  const last = v["last_close"] ?? 0;
  const extreme = trendDir > 0 ? (v["recent_high_15"] ?? 0) : (v["recent_low_15"] ?? 0);
  const depth = last === 0 ? 0 : ((extreme - last) / last) * trendDir;
  if (depth < preset.minPullbackDepth) {
    return noSignal(input, "NO_PULLBACK", "no pullback displacement yet");
  }
  if (depth > preset.maxPullbackDepth) {
    return noSignal(input, "OVERDEEP_PULLBACK", "pullback too deep, trend may be broken");
  }
  // Resumption: the most recent ticks must point back with the trend
  // (rejects buying into a still-falling dip or a failed cross).
  const shortSlope = v["slope_5"] ?? 0;
  if (Math.sign(shortSlope) !== trendDir || Math.abs(shortSlope) < preset.minTrendSlope / 2) {
    return noSignal(input, "NO_RESUMPTION", "no validated resumption toward trend");
  }
  const signal = trendDir > 0 ? "SIGNAL_CALL" : "SIGNAL_PUT";
  return {
    signal,
    strategyId: STRATEGY_ID,
    strategyVersion: STRATEGY_VERSION,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: Math.max(0, Math.min(1, 0.5 + depth / (2 * preset.maxPullbackDepth))),
    pHat: null,
    pBe: pBeOf(input.proposal),
    edge: null,
    evPerStake: null,
    reason: "anchor pullback resumption validated",
    noSignalCode: null,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}
