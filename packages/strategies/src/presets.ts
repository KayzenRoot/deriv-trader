/**
 * Expiry-specific presets and bounded search (DT-WP-03 §12).
 * Seed presets are exploratory research seeds — never pre-labeled validated.
 * Search neighborhoods are bounded with a per-run variant budget; every
 * attempted variant is recorded in the research ledger (research package).
 */
import { createHash } from "node:crypto";
import type { ExpirySeconds } from "@deriv-trader/domain";
import { presetSchema as trendPulseSchema } from "./trend-pulse.js";
import { presetSchema as meanSnapbackSchema } from "./mean-snapback.js";
import { presetSchema as breakoutSurgeSchema } from "./breakout-surge.js";
import { presetSchema as anchorPullbackSchema } from "./anchor-pullback.js";
import { presetSchema as microPressureSchema } from "./micro-pressure.js";

export const SEED_PRESET_VERSION = "seed-1";
/**
 * Strict total attempted-variant budget per run, seed included.
 * gridVariants() never returns more than this many presets total.
 */
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

export function seedPreset(profile: RunnerProfileId): {
  readonly preset: Record<string, number | string>;
  readonly version: string;
  readonly hash: string;
} {
  let preset: Record<string, number | string>;
  switch (profile.strategy) {
    case "trend_pulse":
      preset = trendPulseSchema.parse({});
      break;
    case "mean_snapback":
      preset = meanSnapbackSchema.parse({});
      break;
    case "breakout_surge":
      preset = breakoutSurgeSchema.parse({});
      break;
    case "anchor_pullback":
      preset = anchorPullbackSchema.parse({});
      break;
    case "micro_pressure":
      preset = microPressureSchema.parse({});
      break;
  }
  const version = `${SEED_PRESET_VERSION}+${profile.strategy}+${String(profile.expirySeconds)}s`;
  const canonical = Object.keys(preset)
    .sort()
    .map((key) => `${key}=${String(preset[key])}`)
    .join(",");
  return {
    preset,
    version,
    hash: createHash("sha256").update(`${version}|${canonical}`, "utf8").digest("hex"),
  };
}

export interface SearchDimension {
  readonly param: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** Profile identity makes otherwise equal numeric ranges non-interchangeable. */
  readonly profileId?: string;
  readonly policyHash?: string;
}

export interface SearchPolicyIdentity {
  readonly profileId: string;
  readonly policyVersion: string;
  readonly policyHash: string;
}

function profileIdentity(profile: RunnerProfileId): SearchPolicyIdentity {
  const profileId = `${profile.strategy}_${String(profile.expirySeconds)}s`;
  const policyVersion = "search-policy-1";
  const policyHash = createHash("sha256")
    .update(`${policyVersion}|${profileId}`, "utf8")
    .digest("hex");
  return { profileId, policyVersion, policyHash };
}

/** Bounded neighborhoods per family; deterministic grid order, budget-capped. */
export function searchSpace(input: StrategyFamilyId | RunnerProfileId): SearchDimension[] {
  const strategy = typeof input === "string" ? input : input.strategy;
  const identity = typeof input === "string" ? null : profileIdentity(input);
  const dimensions: SearchDimension[] = (() => {
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
  })();
  return dimensions.map((dimension) => ({
    ...dimension,
    ...(identity ? { profileId: identity.profileId, policyHash: identity.policyHash } : {}),
  }));
}

/** Versioned policy identity recorded independently for every expiry profile. */
export function searchSpaceIdentity(profile: RunnerProfileId): SearchPolicyIdentity {
  return profileIdentity(profile);
}

/** Stable hash for any preset record (expiry-specific via caller versioning). */
export function presetHash(preset: Record<string, number | string>): string {
  const canonical = Object.keys(preset)
    .sort()
    .map((key) => `${key}=${String(preset[key])}`)
    .join(",");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Deterministic grid variants: at most MAX_VARIANTS_PER_RUN TOTAL attempts. */
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
        if (variants.length >= budget) break outer;
        const rounded = Math.round(value * 1e6) / 1e6;
        if ((current[dim.param] as number) === rounded) continue;
        variants.push({ ...current, [dim.param]: rounded });
      }
    }
  }
  return variants.slice(0, budget);
}
