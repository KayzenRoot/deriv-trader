/**
 * Expiry-specific presets and bounded search (DT-WP-03 §12).
 * Seed presets are exploratory research seeds — never pre-labeled validated.
 * Search neighborhoods are bounded with a per-run variant budget; every
 * attempted variant is recorded in the research ledger (research package).
 */
import type { ExpirySeconds } from "@deriv-trader/domain";
import { presetSchema as trendPulseSchema } from "./trend-pulse.js";
import { presetSchema as meanSnapbackSchema } from "./mean-snapback.js";
import { presetSchema as breakoutSurgeSchema } from "./breakout-surge.js";
import { presetSchema as anchorPullbackSchema } from "./anchor-pullback.js";
import { presetSchema as microPressureSchema } from "./micro-pressure.js";

export const SEED_PRESET_VERSION = "seed-1";
export const MAX_VARIANTS_PER_RUN = 12;

export type StrategyFamilyId =
  | "trend_pulse"
  | "mean_snapback"
  | "breakout_surge"
  | "anchor_pullback"
  | "micro_pressure";

export const STRATEGY_FAMILIES: StrategyFamilyId[] = [
  "trend_pulse",
  "mean_snapback",
  "breakout_surge",
  "anchor_pullback",
  "micro_pressure",
];

export const EXPIRIES: ExpirySeconds[] = [60, 180, 300];

export interface RunnerProfileId {
  readonly strategy: StrategyFamilyId;
  readonly expirySeconds: ExpirySeconds;
}

export const ALL_PROFILES: RunnerProfileId[] = STRATEGY_FAMILIES.flatMap((strategy) =>
  EXPIRIES.map((expirySeconds) => ({ strategy, expirySeconds })),
);

export function seedPreset(strategy: StrategyFamilyId): Record<string, number | string> {
  switch (strategy) {
    case "trend_pulse":
      return trendPulseSchema.parse({});
    case "mean_snapback":
      return meanSnapbackSchema.parse({});
    case "breakout_surge":
      return breakoutSurgeSchema.parse({});
    case "anchor_pullback":
      return anchorPullbackSchema.parse({});
    case "micro_pressure":
      return microPressureSchema.parse({});
  }
}

export interface SearchDimension {
  readonly param: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** Bounded neighborhoods per family; deterministic grid order, budget-capped. */
export function searchSpace(strategy: StrategyFamilyId): SearchDimension[] {
  switch (strategy) {
    case "trend_pulse":
      return [
        { param: "minSlope", min: 0.0001, max: 0.0005, step: 0.0001 },
        { param: "minPersistence", min: 0.2, max: 0.5, step: 0.1 },
      ];
    case "mean_snapback":
      return [
        { param: "entryZ", min: 1.0, max: 2.5, step: 0.5 },
        { param: "maxTrendSlope", min: 0.0005, max: 0.002, step: 0.0005 },
      ];
    case "breakout_surge":
      return [
        { param: "maxCompression", min: 1.5, max: 4, step: 0.5 },
        { param: "minExpansionRatio", min: 1.2, max: 2, step: 0.2 },
      ];
    case "anchor_pullback":
      return [
        { param: "minPullbackDepth", min: 0.0002, max: 0.001, step: 0.0002 },
        { param: "maxPullbackDepth", min: 0.004, max: 0.01, step: 0.002 },
      ];
    case "micro_pressure":
      return [
        { param: "minImbalance", min: 0.25, max: 0.55, step: 0.1 },
        { param: "minEfficiency", min: 0.3, max: 0.6, step: 0.1 },
      ];
  }
}

/** Deterministic grid variants, capped at the per-run budget. */
export function gridVariants(
  seed: Record<string, number | string>,
  space: SearchDimension[],
  budget: number = MAX_VARIANTS_PER_RUN,
): Record<string, number | string>[] {
  const variants: Record<string, number | string>[] = [{ ...seed }];
  outer: for (const dim of space) {
    const base = variants.length;
    for (let i = 0; i < base; i += 1) {
      const current = variants[i];
      if (!current) continue;
      for (let value = dim.min; value <= dim.max + 1e-12; value += dim.step) {
        if (variants.length >= budget + 1) break outer;
        const rounded = Math.round(value * 1e6) / 1e6;
        if ((current[dim.param] as number) === rounded) continue;
        variants.push({ ...current, [dim.param]: rounded });
      }
    }
  }
  return variants.slice(0, budget + 1);
}
