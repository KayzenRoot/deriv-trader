/**
 * Strategy 1 — Trend Pulse: short-horizon momentum continuation.
 * Buys continuation only when windows agree, persistence holds, volatility is
 * bounded and no jump/staleness contaminates the read. Symmetric CALL/PUT.
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf, preflight } from "./engine.js";

export const STRATEGY_ID = "trend_pulse";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  minSlope: z.number().positive().default(0.0002),
  minPersistence: z.number().min(0).max(1).default(0.3),
  maxVolatility: z.number().positive().default(0.01),
  maxExtension: z.number().positive().default(0.01),
  maxDeceleration: z.number().positive().default(0.002),
  minTickRate: z.number().min(0).default(0.05),
});

export type TrendPulsePreset = z.infer<typeof presetSchema>;

function qualityOf(parts: number[]): number {
  const clamped = parts.map((p) => Math.max(0, Math.min(1, p)));
  return clamped.reduce((a, b) => a + b, 0) / Math.max(1, clamped.length);
}

export function decideTrendPulse(
  input: StrategyInput,
  preset: TrendPulsePreset,
): StrategyOutput {
  const blocked = preflight(input);
  if (blocked) return blocked;
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "JUMP_FILTER", "isolated jump filtered");
  const slope10 = v["slope_10"] ?? 0;
  const slope20 = v["slope_20"] ?? 0;
  if (Math.sign(slope10) !== Math.sign(slope20) || slope10 === 0) {
    return noSignal(input, "CONFLICTING_WINDOWS", "momentum windows disagree");
  }
  if (Math.abs(slope10) < preset.minSlope) {
    return noSignal(input, "INSUFFICIENT_EVIDENCE", "slope below minimum");
  }
  const persistence = (v["persistence_20"] ?? 0) * Math.sign(slope10);
  if (persistence < preset.minPersistence) {
    return noSignal(input, "WEAK_PERSISTENCE", "directional persistence too low");
  }
  if ((v["volatility_20"] ?? 0) > preset.maxVolatility) {
    return noSignal(input, "EXTREME_VOLATILITY", "volatility above bound");
  }
  const accel = (v["acceleration"] ?? 0) * Math.sign(slope10);
  if (accel < -preset.maxDeceleration) {
    return noSignal(input, "DECELERATING", "momentum decelerating against entry");
  }
  if (Math.abs(v["anchor_distance"] ?? 0) > preset.maxExtension) {
    return noSignal(input, "LATE_EXTENSION", "extended too far from anchor");
  }
  if ((v["tick_rate_50"] ?? 0) < preset.minTickRate) {
    return noSignal(input, "THIN_MARKET", "tick density too low");
  }
  const signal = slope10 > 0 ? "SIGNAL_CALL" : "SIGNAL_PUT";
  return {
    signal,
    strategyId: STRATEGY_ID,
    strategyVersion: STRATEGY_VERSION,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: qualityOf([
      Math.abs(slope10) / (preset.minSlope * 3),
      persistence,
      1 - (v["volatility_20"] ?? 0) / preset.maxVolatility,
    ]),
    pHat: null,
    pBe: pBeOf(input.proposal),
    edge: null,
    evPerStake: null,
    reason: "trend continuation validated",
    noSignalCode: null,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}
