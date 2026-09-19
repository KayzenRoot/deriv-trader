/**
 * Strategy 5 — Micro Pressure: tick/microstructure pressure proxy.
 * Signed tick-direction imbalance, runs, arrival rate and efficiency over
 * genuine tick data only. Never invents volume, delta or book imbalance, and
 * never claims full Order Flow.
 */
import { z } from "zod";
import type { StrategyInput, StrategyOutput } from "./engine.js";
import { noSignal, pBeOf } from "./engine.js";

export const STRATEGY_ID = "micro_pressure";
export const STRATEGY_VERSION = "1.0.0";

export const presetSchema = z.object({
  minImbalance: z.number().min(0).max(1).default(0.35),
  minRun: z.number().int().min(2).default(3),
  minTickRate: z.number().min(0).default(0.1),
  maxTickRate: z.number().positive().default(20),
  minEfficiency: z.number().min(0).max(1).default(0.4),
  maxChangePerTick: z.number().positive().default(0.005),
});

export type MicroPressurePreset = z.infer<typeof presetSchema>;

export function decideMicroPressure(
  input: StrategyInput,
  preset: MicroPressurePreset,
): StrategyOutput {
  const v = input.features.values;
  if (input.features.anomaly) return noSignal(input, "OUTLIER_FILTER", "micro-burst outlier rejected");
  const imbalance = v["persistence_20"] ?? 0;
  if (Math.abs(imbalance) < preset.minImbalance) {
    return noSignal(input, "NO_IMBALANCE", "signed imbalance too weak");
  }
  if ((v["max_run_20"] ?? 0) < preset.minRun) {
    return noSignal(input, "NO_RUN", "no directional run structure");
  }
  const rate = v["tick_rate_50"] ?? 0;
  if (rate < preset.minTickRate || rate > preset.maxTickRate) {
    return noSignal(input, "ARRIVAL_REGIME", "tick arrival outside microstructure band");
  }
  if ((v["efficiency_10"] ?? 0) < preset.minEfficiency) {
    return noSignal(input, "LOW_EFFICIENCY", "choppy microstructure, no clean pressure");
  }
  if ((v["price_change_per_tick_10"] ?? 0) > preset.maxChangePerTick) {
    return noSignal(input, "GAPPY_MICROSTRUCTURE", "per-tick moves too large");
  }
  const signal = imbalance > 0 ? "SIGNAL_CALL" : "SIGNAL_PUT";
  return {
    signal,
    strategyId: STRATEGY_ID,
    strategyVersion: STRATEGY_VERSION,
    runnerId: input.runnerId,
    instrument: input.instrument,
    expirySeconds: input.expirySeconds,
    timestamp: input.decisionTime,
    featureHash: input.features.hash,
    quality: Math.max(0, Math.min(1, (Math.abs(imbalance) + (v["efficiency_10"] ?? 0)) / 2)),
    pHat: null,
    pBe: pBeOf(input.proposal),
    edge: null,
    evPerStake: null,
    reason: "microstructure pressure validated",
    noSignalCode: null,
    presetVersion: input.presetVersion,
    configVersion: input.configVersion,
  };
}
