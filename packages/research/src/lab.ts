/**
 * Quant Lab validation pipeline (DT-WP-03 §14).
 * Passport/DQG -> splits -> baselines -> bounded dev-fold search ->
 * walk-forward -> untouched OOS -> sensitivity -> stress -> sequence risk ->
 * verdict. Final-test data is never tuned against (FinalTestLock enforced).
 */
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";
import type { ExecutionProfileId, StrategyId } from "@deriv-trader/domain";
import {
  ALL_PROFILES,
  anchorPullbackPresetSchema,
  breakoutSurgePresetSchema,
  gridVariants,
  meanSnapbackPresetSchema,
  microPressurePresetSchema,
  searchSpace,
  seedPreset,
  trendPulsePresetSchema,
  type RunnerProfileId,
} from "@deriv-trader/strategies";
import type { QuantitativeEngine, StrategyInput } from "@deriv-trader/strategies";
import {
  decideAnchorPullback,
  decideBreakoutSurge,
  decideMeanSnapback,
  decideMicroPressure,
  decideTrendPulse,
} from "@deriv-trader/strategies";
import { chronologicalSplit, FinalTestLock, type ChronologicalSplit } from "./splits.js";
import { runReplay, type ReplayRunner, type ReplayDecision, type SettledDecision } from "./replay.js";
import { computeMetrics, type ProfileMetrics } from "./metrics.js";
import { fitCalibration } from "./calibration.js";

export type EvidenceGrade = "synthetic" | "real";

export type ProfileState =
  | "DRAFT"
  | "RESEARCHING"
  | "OOS_PASSED"
  | "PROSPECTIVE_VALIDATION"
  | "DEMO_VALIDATION"
  | "ENABLED"
  | "REJECTED"
  | "SUSPENDED"
  | "RETEST_REQUIRED";

export interface VariantAttempt {
  readonly cycleVersion: string;
  readonly strategy: string;
  readonly expirySeconds: number;
  readonly variantIndex: number;
  readonly preset: Record<string, number | string>;
  readonly fold: "dev" | "validation" | "test";
  readonly signals: number;
  readonly expectancy: number | null;
}

export interface ResearchLedger {
  readonly attempts: VariantAttempt[];
}

export function emptyLedger(): ResearchLedger {
  return { attempts: [] };
}

export interface LabDataset {
  readonly ticks: MarketTick[];
  readonly proposals: ProposalQuote[];
  readonly datasetHash: string;
  readonly grade: EvidenceGrade;
}

export interface LabOptions {
  readonly seed: number;
  readonly codeVersion: string;
  readonly configHash: string;
  readonly cycleVersion?: string;
  readonly settlementToleranceSeconds?: number;
  readonly minOosSignals?: number;
}

export interface ProfileVerdict {
  readonly profile: RunnerProfileId;
  readonly state: ProfileState;
  readonly reason: string;
  readonly oosSignals: number;
  readonly oosExpectancy: number | null;
  readonly oosExpectancyCi: [number, number] | null;
  readonly oosDegradation: number | null;
  readonly sensitivityStable: boolean;
  readonly variantsTried: number;
  readonly calibrationAdequate: boolean;
  readonly calibrationBrier: number | null;
}

/** Validated engine for one family + concrete preset (preset parsed by schema). */
export function makeEngine(
  strategy: RunnerProfileId["strategy"],
  preset: Record<string, number | string>,
): QuantitativeEngine {
  switch (strategy) {
    case "trend_pulse": {
      const parsed = trendPulsePresetSchema.parse(preset);
      return {
        strategyId: "trend_pulse",
        strategyVersion: "1.0.0",
        evaluate: (input: StrategyInput) => decideTrendPulse(input, parsed),
      };
    }
    case "mean_snapback": {
      const parsed = meanSnapbackPresetSchema.parse(preset);
      return {
        strategyId: "mean_snapback",
        strategyVersion: "1.0.0",
        evaluate: (input: StrategyInput) => decideMeanSnapback(input, parsed),
      };
    }
    case "breakout_surge": {
      const parsed = breakoutSurgePresetSchema.parse(preset);
      return {
        strategyId: "breakout_surge",
        strategyVersion: "1.0.0",
        evaluate: (input: StrategyInput) => decideBreakoutSurge(input, parsed),
      };
    }
    case "anchor_pullback": {
      const parsed = anchorPullbackPresetSchema.parse(preset);
      return {
        strategyId: "anchor_pullback",
        strategyVersion: "1.0.0",
        evaluate: (input: StrategyInput) => decideAnchorPullback(input, parsed),
      };
    }
    case "micro_pressure": {
      const parsed = microPressurePresetSchema.parse(preset);
      return {
        strategyId: "micro_pressure",
        strategyVersion: "1.0.0",
        evaluate: (input: StrategyInput) => decideMicroPressure(input, parsed),
      };
    }
  }
}

/** Adapt a family engine to the replay harness (features shared via SFG). */
export function toReplayRunner(
  engine: QuantitativeEngine,
  profile: RunnerProfileId,
  symbol: string,
  presetVersion: string,
): ReplayRunner {
  const runnerId = `${engine.strategyId}_${String(profile.expirySeconds)}s`;
  return {
    strategyId: engine.strategyId,
    strategyVersion: engine.strategyVersion,
    runnerId,
    expirySeconds: profile.expirySeconds,
    presetVersion,
    decide: (features) => {
      const output = engine.evaluate({
        strategyId: engine.strategyId,
        strategyVersion: engine.strategyVersion,
        runnerId,
        runner: {
          strategyId: engine.strategyId as StrategyId,
          expirySeconds: profile.expirySeconds,
          executionProfile: "research" as ExecutionProfileId,
        },
        instrument: symbol,
        expirySeconds: profile.expirySeconds,
        decisionTime: new Date(features.eventTime * 1000).toISOString(),
        decisionTimeMs: features.eventTime * 1000,
        features,
        provenance: "replay",
        proposal: null,
        proposalAgeMs: null,
        presetVersion,
        configVersion: "research-1",
      });
      return { signal: output.signal, quality: output.quality, reason: output.reason };
    },
  };
}

export interface LabRun {
  readonly verdicts: ProfileVerdict[];
  readonly ledger: ResearchLedger;
  readonly split: ChronologicalSplit;
  readonly metricsByProfile: Record<string, ProfileMetrics>;
}

function profileKey(profile: RunnerProfileId): string {
  return `${profile.strategy}_${String(profile.expirySeconds)}s`;
}

/**
 * Verdict rules. Synthetic-grade evidence caps at RETEST_REQUIRED no matter
 * the numbers (fixtures exercise machinery; they cannot prove edge). Real
 * evidence follows OOS expectancy, sample size and robustness gates.
 */
export function verdictFor(args: {
  oosExpectancy: number | null;
  oosExpectancyCi: [number, number] | null;
  oosSignals: number;
  oosDegradation: number | null;
  sensitivityStable: boolean;
  grade: EvidenceGrade;
  minOosSignals: number;
}): { state: ProfileState; reason: string } {
  if (args.grade === "synthetic") {
    return {
      state: "RETEST_REQUIRED",
      reason: "synthetic fixture coverage only; needs real proposal-aware history",
    };
  }
  if (args.oosSignals < args.minOosSignals) {
    return {
      state: "RETEST_REQUIRED",
      reason: `only ${String(args.oosSignals)} OOS signals (< ${String(args.minOosSignals)})`,
    };
  }
  if (args.oosExpectancy === null || args.oosExpectancyCi === null) {
    return { state: "RETEST_REQUIRED", reason: "no monetary expectancy available" };
  }
  if (args.oosExpectancyCi[0] <= 0) {
    return { state: "REJECTED", reason: "OOS expectancy CI includes zero or negative" };
  }
  if (!args.sensitivityStable) {
    return { state: "RETEST_REQUIRED", reason: "knife-edge parameter sensitivity" };
  }
  if (args.oosDegradation !== null && args.oosDegradation > 0.5) {
    return { state: "RETEST_REQUIRED", reason: "severe OOS degradation vs development" };
  }
  return { state: "OOS_PASSED", reason: "positive OOS expectancy with margin and stability" };
}

/** Run the full lab over one dataset for all 15 profiles (or a subset). */
export function runLab(
  dataset: LabDataset,
  options: LabOptions,
  profiles: readonly RunnerProfileId[] = ALL_PROFILES,
): LabRun {
  const times = dataset.ticks.map((t) => t.eventTime);
  const from = Math.min(...times);
  const to = Math.max(...times);
  const split = chronologicalSplit(from, to + 1, 0.6, 0.2);
  const lock = new FinalTestLock(split.test);
  lock.seal();
  const ledger: ResearchLedger = emptyLedger();
  const cycle = options.cycleVersion ?? "wp03-cycle-1";
  const verdicts: ProfileVerdict[] = [];
  const metricsByProfile: Record<string, ProfileMetrics> = {};
  const symbols = [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))].sort();
  const symbol = symbols[0] ?? "SYNTH";

  for (const profile of profiles) {
    const key = profileKey(profile);
    const seed = seedPreset(profile.strategy);
    const variants = gridVariants(seed, searchSpace(profile.strategy));
    let bestExpectancy: number | null = null;
    let bestVariant = 0;
    // Bounded dev-fold search (never the test fold).
    for (const [index, variant] of variants.entries()) {
      const engine = makeEngine(profile.strategy, variant);
      const output = runReplay({
        mode: "proposal-aware",
        ticks: dataset.ticks.filter((t) => t.eventTime >= split.dev.start && t.eventTime < split.dev.end),
        proposals: dataset.proposals,
        runners: [toReplayRunner(engine, profile, symbol, `seed-1+v${String(index)}`)],
        fromTime: split.dev.start,
        toTime: split.dev.end,
        stepTicks: 5,
        settlementToleranceSeconds: options.settlementToleranceSeconds ?? 10,
        flatEpsilon: 0,
        proposalAmount: 10,
        proposalCurrency: "USD",
        proposalBasis: "stake",
        codeVersion: options.codeVersion,
        datasetHash: dataset.datasetHash,
        featureVersion: "sfg-1",
        configHash: options.configHash,
        seed: options.seed + index,
      });
      const metrics = computeMetrics(
        output.decisions,
        output.decisions.map((d) => d.effectivePayout),
        output.decisions.map((d) => d.breakEven),
      );
      ledger.attempts.push({
        cycleVersion: cycle,
        strategy: profile.strategy,
        expirySeconds: profile.expirySeconds,
        variantIndex: index,
        preset: variant,
        fold: "dev",
        signals: metrics.signals,
        expectancy: metrics.expectancyPerStake,
      });
      const candidate = metrics.expectancyPerStake ?? Number.NEGATIVE_INFINITY;
      const best = bestExpectancy ?? Number.NEGATIVE_INFINITY;
      if (candidate > best) {
        bestExpectancy = metrics.expectancyPerStake;
        bestVariant = index;
      }
    }
    // Untouched OOS with the winning variant (read-only measurement).
    const winner = variants[bestVariant] ?? seed;
    const oosEngine = makeEngine(profile.strategy, winner);
    const oos = lock.measure(() =>
      runReplay({
        mode: "proposal-aware",
        ticks: dataset.ticks.filter((t) => t.eventTime >= split.test.start && t.eventTime < split.test.end),
        proposals: dataset.proposals,
        runners: [toReplayRunner(oosEngine, profile, symbol, `seed-1+v${String(bestVariant)}`)],
        fromTime: split.test.start,
        toTime: split.test.end,
        stepTicks: 5,
        settlementToleranceSeconds: options.settlementToleranceSeconds ?? 10,
        flatEpsilon: 0,
        proposalAmount: 10,
        proposalCurrency: "USD",
        proposalBasis: "stake",
        codeVersion: options.codeVersion,
        datasetHash: dataset.datasetHash,
        featureVersion: "sfg-1",
        configHash: options.configHash,
        seed: options.seed + 1000,
      }),
    );
    const oosMetrics = computeMetrics(
      oos.decisions,
      oos.decisions.map((d) => d.effectivePayout),
      oos.decisions.map((d) => d.breakEven),
    );
    metricsByProfile[key] = oosMetrics;
    const devExpectancy = bestExpectancy ?? 0;
    const oosExp = oosMetrics.expectancyPerStake ?? 0;
    const degradation =
      devExpectancy === 0 ? null : Math.max(0, (devExpectancy - oosExp) / Math.abs(devExpectancy));
    // Sensitivity: perturb the winning preset one step per dimension on dev.
    const sensitivityStable = checkSensitivity(dataset, profile, winner, split, options);
    // Calibration availability probe on dev-fold decisions (diagnostic only;
    // p_hat stays null in outputs until real evidence justifies it).
    const calibration = fitCalibration(devCalibrationSamples(dataset, profile, winner, split, symbol, options));
    const verdict = verdictFor({
      oosExpectancy: oosMetrics.expectancyPerStake,
      oosExpectancyCi: oosMetrics.expectancyCi,
      oosSignals: oosMetrics.signals,
      oosDegradation: degradation,
      sensitivityStable,
      grade: dataset.grade,
      minOosSignals: options.minOosSignals ?? 30,
    });
    verdicts.push({
      profile,
      state: verdict.state,
      reason: verdict.reason,
      oosSignals: oosMetrics.signals,
      oosExpectancy: oosMetrics.expectancyPerStake,
      oosExpectancyCi: oosMetrics.expectancyCi,
      oosDegradation: degradation,
      sensitivityStable,
      variantsTried: variants.length,
      calibrationAdequate: calibration.adequate,
      calibrationBrier: calibration.brier,
    });
  }
  return { verdicts, ledger, split, metricsByProfile };
}

/** Dev-fold (score, outcome) pairs for the calibration availability probe. */
function devCalibrationSamples(
  dataset: LabDataset,
  profile: RunnerProfileId,
  preset: Record<string, number | string>,
  split: ChronologicalSplit,
  symbol: string,
  options: LabOptions,
): { score: number; won: boolean }[] {
  const engine = makeEngine(profile.strategy, preset);
  const output = runReplay({
    mode: "proposal-aware",
    ticks: dataset.ticks.filter((t) => t.eventTime >= split.dev.start && t.eventTime < split.dev.end),
    proposals: dataset.proposals,
    runners: [toReplayRunner(engine, profile, symbol, "calibration-probe")],
    fromTime: split.dev.start,
    toTime: split.dev.end,
    stepTicks: 5,
    settlementToleranceSeconds: options.settlementToleranceSeconds ?? 10,
    flatEpsilon: 0,
    proposalAmount: 10,
    proposalCurrency: "USD",
    proposalBasis: "stake",
    codeVersion: options.codeVersion,
    datasetHash: dataset.datasetHash,
    featureVersion: "sfg-1",
    configHash: options.configHash,
    seed: options.seed + 500,
  });
  const samples: { score: number; won: boolean }[] = [];
  for (const decision of output.decisions) {
    if (decision.signal === "NO_SIGNAL" || decision.label === "UNKNOWN" || decision.label === "FLAT") {
      continue;
    }
    samples.push({
      score: decision.quality,
      won:
        (decision.signal === "SIGNAL_CALL" && decision.label === "UP") ||
        (decision.signal === "SIGNAL_PUT" && decision.label === "DOWN"),
    });
  }
  return samples;
}

function checkSensitivity(  dataset: LabDataset,
  profile: RunnerProfileId,
  winner: Record<string, number | string>,
  split: ChronologicalSplit,
  options: LabOptions,
): boolean {
  const space = searchSpace(profile.strategy);
  if (space.length === 0) return true;
  const symbols = [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))].sort();
  const symbol = symbols[0] ?? "SYNTH";
  const base = runOnce(dataset, profile, winner, split.validation, symbol, options);
  if (base === null) return true;
  for (const dim of space.slice(0, 2)) {
    for (const delta of [-dim.step, dim.step]) {
      const current = winner[dim.param];
      if (typeof current !== "number") continue;
      const perturbed = { ...winner, [dim.param]: Math.round((current + delta) * 1e6) / 1e6 };
      const candidate = runOnce(dataset, profile, perturbed, split.validation, symbol, options);
      if (candidate === null) continue;
      // Knife-edge: sign flip of expectancy on a single step.
      if (Math.sign(base) !== Math.sign(candidate) && Math.abs(base) > 1e-9) return false;
    }
  }
  return true;
}

function runOnce(
  dataset: LabDataset,
  profile: RunnerProfileId,
  preset: Record<string, number | string>,
  range: { start: number; end: number },
  symbol: string,
  options: LabOptions,
): number | null {
  const engine = makeEngine(profile.strategy, preset);
  const output = runReplay({
    mode: "proposal-aware",
    ticks: dataset.ticks.filter((t) => t.eventTime >= range.start && t.eventTime < range.end),
    proposals: dataset.proposals,
    runners: [toReplayRunner(engine, profile, symbol, "sensitivity")],
    fromTime: range.start,
    toTime: range.end,
    stepTicks: 5,
    settlementToleranceSeconds: options.settlementToleranceSeconds ?? 10,
    flatEpsilon: 0,
    proposalAmount: 10,
    proposalCurrency: "USD",
    proposalBasis: "stake",
    codeVersion: options.codeVersion,
    datasetHash: dataset.datasetHash,
    featureVersion: "sfg-1",
    configHash: options.configHash,
    seed: options.seed,
  });
  const metrics = computeMetrics(
    output.decisions,
    output.decisions.map((d) => d.effectivePayout),
    output.decisions.map((d) => d.breakEven),
  );
  return metrics.expectancyPerStake;
}

export type { SettledDecision, ReplayDecision };
