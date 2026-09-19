/**
 * Strategy 4 — Anchor Pullback: trend pullback to the Adaptive Price Anchor.
 * Enters only on validated resumption toward the trend. Never claims true
 * VWAP: the anchor is an explicitly named EMA/TWAP-like level (no volume).
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf } from "./engine.js";

export const STRATEGY_ID = "anchor_pullback";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  minTrendSlope: z.number().positive().default(0.0003),
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
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "ANOMALOUS_DATA", "anomalous input rejected");
  const trendSlope = v["slope_20"] ?? 0;
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
  const distance = v["anchor_distance"] ?? 0;
  // Pullback: price displaced opposite the trend, within a controlled band.
  const depth = -distance * trendDir;
  if (depth < preset.minPullbackDepth) {
    return noSignal(input, "NO_PULLBACK", "no pullback displacement yet");
  }
  if (depth > preset.maxPullbackDepth) {
    return noSignal(input, "OVERDEEP_PULLBACK", "pullback too deep, trend may be broken");
  }
  // Resumption: short slope must point back with the trend (reject cross fail).
  const shortSlope = v["slope_10"] ?? 0;
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
