/**
 * Strategies package entry (DT-WP-03).
 * Five independent families + SFG + Edge Gate + presets. Strategies never
 * import risk, execution or broker adapter code (enforced by dep allowlist).
 */
import type {
  DecisionSignal,
  ExpirySeconds,
  RunnerIdentity,
} from "@deriv-trader/domain";

export interface StrategyContext {
  readonly runner: RunnerIdentity;
  readonly symbol: string;
  readonly now: string;
}

export interface StrategyDecision {
  readonly signal: DecisionSignal;
  readonly reason: string;
  readonly expirySeconds: ExpirySeconds;
}

export interface StrategyEngine {
  readonly strategyId: string;
  decide(context: StrategyContext): StrategyDecision;
}

export class NoSignalStrategyEngine implements StrategyEngine {
  readonly strategyId = "foundation_no_signal";
  decide(context: StrategyContext): StrategyDecision {
    return {
      signal: "NO_SIGNAL",
      reason: `foundation skeleton for ${context.runner.strategyId}`,
      expirySeconds: context.runner.expirySeconds,
    };
  }
}

export { FEATURE_VERSION, SharedFeatureGraph, computeFeatures, hashSnapshot } from "./features.js";
export type { FeatureSnapshot, FeatureOptions } from "./features.js";
export type { StrategyInput, StrategyOutput, QuantitativeEngine } from "./engine.js";
export { noSignal, preflight, PREFLIGHT_MIN_BARS } from "./engine.js";
export { evaluateEdge } from "./edge.js";
export type { EdgeInput, EdgeResult, EdgeVerdict } from "./edge.js";
export { decideTrendPulse, STRATEGY_ID as TREND_PULSE_ID, STRATEGY_VERSION as TREND_PULSE_VERSION } from "./trend-pulse.js";
export { presetSchema as trendPulsePresetSchema } from "./trend-pulse.js";
export type { TrendPulsePreset } from "./trend-pulse.js";
export { decideMeanSnapback, STRATEGY_ID as MEAN_SNAPBACK_ID, STRATEGY_VERSION as MEAN_SNAPBACK_VERSION } from "./mean-snapback.js";
export { presetSchema as meanSnapbackPresetSchema } from "./mean-snapback.js";
export type { MeanSnapbackPreset } from "./mean-snapback.js";
export { decideBreakoutSurge, STRATEGY_ID as BREAKOUT_SURGE_ID, STRATEGY_VERSION as BREAKOUT_SURGE_VERSION } from "./breakout-surge.js";
export { presetSchema as breakoutSurgePresetSchema } from "./breakout-surge.js";
export type { BreakoutSurgePreset } from "./breakout-surge.js";
export { decideAnchorPullback, STRATEGY_ID as ANCHOR_PULLBACK_ID, STRATEGY_VERSION as ANCHOR_PULLBACK_VERSION } from "./anchor-pullback.js";
export { presetSchema as anchorPullbackPresetSchema } from "./anchor-pullback.js";
export type { AnchorPullbackPreset } from "./anchor-pullback.js";
export { decideMicroPressure, STRATEGY_ID as MICRO_PRESSURE_ID, STRATEGY_VERSION as MICRO_PRESSURE_VERSION } from "./micro-pressure.js";
export { presetSchema as microPressurePresetSchema } from "./micro-pressure.js";
export type { MicroPressurePreset } from "./micro-pressure.js";
export {
  ALL_PROFILES,
  EXPIRIES as PROFILE_EXPIRIES,
  MAX_VARIANTS_PER_RUN,
  SEED_PRESET_VERSION,
  STRATEGY_FAMILIES,
  gridVariants,
  presetHash,
  searchSpace,
  searchSpaceIdentity,
  seedPreset,
} from "./presets.js";
export type { RunnerProfileId, SearchDimension, SearchPolicyIdentity, StrategyFamilyId } from "./presets.js";
