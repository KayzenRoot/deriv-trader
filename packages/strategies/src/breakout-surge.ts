/**
 * Strategy 3 — Breakout Surge: compression-to-expansion breakout.
 * Requires demonstrated prior compression, a genuine expansion with hold,
 * and rejects spikes, snapbacks and late moves. Symmetric CALL/PUT.
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf } from "./engine.js";

export const STRATEGY_ID = "breakout_surge";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  maxCompression: z.number().positive().default(2.5),
  minExpansionRatio: z.number().min(1).default(1.4),
  minBreakoutDistance: z.number().positive().default(0.15),
  minHoldPersistence: z.number().min(0).max(1).default(0.4),
  maxSpikeMultiple: z.number().positive().default(4),
});

export type BreakoutSurgePreset = z.infer<typeof presetSchema>;

export function decideBreakoutSurge(
  input: StrategyInput,
  preset: BreakoutSurgePreset,
): StrategyOutput {
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "SPIKE_FILTER", "giant isolated spike rejected");
  if ((v["compression_50"] ?? Number.POSITIVE_INFINITY) > preset.maxCompression) {
    return noSignal(input, "NO_COMPRESSION", "no prior compression regime");
  }
  if ((v["expansion_ratio"] ?? 0) < preset.minExpansionRatio) {
    return noSignal(input, "NO_EXPANSION", "volatility not expanding");
  }
  const position = v["range_position_50"] ?? 0.5;
  const distance = Math.abs(position - 0.5) * 2;
  if (distance < preset.minBreakoutDistance) {
    return noSignal(input, "WEAK_BREAKOUT", "breakout distance too small");
  }
  if (distance > preset.maxSpikeMultiple * preset.minBreakoutDistance) {
    return noSignal(input, "MATURE_MOVE", "move too extended to chase");
  }
  const direction = position > 0.5 ? 1 : -1;
  const hold = (v["persistence_20"] ?? 0) * direction;
  if (hold < preset.minHoldPersistence) {
    return noSignal(input, "WEAK_HOLD", "no directional hold after break");
  }
  // Immediate snapback: short slope opposes the breakout direction.
  if (Math.sign(v["slope_10"] ?? 0) === -direction && Math.abs(v["slope_10"] ?? 0) > 0.0001) {
    return noSignal(input, "IMMEDIATE_SNAPBACK", "price snapping back already");
  }
  const signal = direction > 0 ? "SIGNAL_CALL" : "SIGNAL_PUT";
  return {
    signal,
    strategyId: STRATEGY_ID,
    strategyVersion: STRATEGY_VERSION,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: Math.max(0, Math.min(1, hold)),
    pHat: null,
    pBe: pBeOf(input.proposal),
    edge: null,
    evPerStake: null,
    reason: "compression breakout with hold validated",
    noSignalCode: null,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}
