/**
 * Strategy 2 — Mean Snapback: short-horizon mean reversion.
 * Fades statistically stretched moves in range-like conditions with
 * deceleration evidence. Mirrored CALL/PUT logic around the adaptive mean.
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf } from "./engine.js";

export const STRATEGY_ID = "mean_snapback";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  entryZ: z.number().positive().default(1.5),
  maxTrendSlope: z.number().positive().default(0.001),
  minVolatility: z.number().min(0).default(0.00005),
  maxVolatility: z.number().positive().default(0.008),
  maxRangePosition: z.number().min(0.5).max(1).default(0.95),
});

export type MeanSnapbackPreset = z.infer<typeof presetSchema>;

export function decideMeanSnapback(
  input: StrategyInput,
  preset: MeanSnapbackPreset,
): StrategyOutput {
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "SHOCK_FILTER", "shock/jump rejected");
  if (Math.abs(v["slope_20"] ?? 0) > preset.maxTrendSlope) {
    return noSignal(input, "STRONG_TREND", "directional trend too strong for reversion");
  }
  const vol = v["volatility_20"] ?? 0;
  if (vol < preset.minVolatility || vol > preset.maxVolatility) {
    return noSignal(input, "VOLATILITY_BAND", "volatility outside reversion band");
  }
  const zscore = v["zscore_20"] ?? 0;
  // Deceleration proxy: short slope weaker than the longer slope magnitude.
  const decelerating = Math.abs(v["slope_10"] ?? 0) < Math.abs(v["slope_20"] ?? 0);
  if (!decelerating) {
    return noSignal(input, "NO_REVERSAL_CONFIRMATION", "extension still accelerating");
  }
  const position = v["range_position_50"] ?? 0.5;
  if (Math.abs(zscore) < preset.entryZ) {
    return noSignal(input, "INSUFFICIENT_STRETCH", "deviation below entry");
  }
  if (position > preset.maxRangePosition || position < 1 - preset.maxRangePosition) {
    return noSignal(input, "ACTIVE_BREAKOUT", "price outside tradable band");
  }
  // Mirror: oversold (z<0) snaps up (CALL); overbought snaps down (PUT).
  const signal = zscore < 0 ? "SIGNAL_CALL" : "SIGNAL_PUT";
  const stretch = Math.min(1, (Math.abs(zscore) - preset.entryZ) / preset.entryZ);
  return {
    signal,
    strategyId: STRATEGY_ID,
    strategyVersion: STRATEGY_VERSION,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: Math.max(0, Math.min(1, 0.4 + 0.6 * stretch)),
    pHat: null,
    pBe: pBeOf(input.proposal),
    edge: null,
    evPerStake: null,
    reason: "mean-reversion snapback validated",
    noSignalCode: null,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}
