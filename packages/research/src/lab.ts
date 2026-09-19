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
  presetHash,
  searchSpace,
  searchSpaceIdentity,
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
import {
  calibrateWithCapability,
  capabilityFor,
  chronologicalSplit,
  FinalTestLock,
  measureWithCapability,
  rollingWalkForward,
  searchWithCapability,
  type ChronologicalSplit,
} from "./splits.js";
import {
  DEFAULT_PROPOSAL_TTL_MS,
  REPLAY_ECONOMICS_VERSION,
  runReplay,
  type ReplayRunner,
  type ReplayDecision,
  type SettledDecision,
} from "./replay.js";
import { computeMetrics, stressedExpectancy, type ProfileMetrics } from "./metrics.js";
import { calibrateScore, fitCalibration } from "./calibration.js";
import { toProposalRow, toTickRow } from "./capture.js";
import { blocksDataset, checkProposals, checkTicks, type DqgFinding } from "./dqg.js";
import { verifyPassport, type DatasetPassport } from "./passport.js";
import { evaluateEdge } from "@deriv-trader/strategies";

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
  readonly presetHash: string;
  readonly configHash: string;
  readonly fold: "dev" | "validation" | "test";
  readonly access: "search" | "measure" | "sensitivity" | "calibration";
  readonly signals: number;
  readonly expectancy: number | null;
  readonly searchPolicyId?: string;
  readonly searchPolicyHash?: string;
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
  /** Present only when Passport + file hashes + DQG were verified. */
  readonly passport?: DatasetPassport;
  readonly dqgFindings?: readonly DqgFinding[];
  readonly verifiedAdmission?: boolean;
}

export interface ResearchDatasetAdmissionInput {
  readonly ticks: readonly MarketTick[];
  readonly proposals: readonly ProposalQuote[];
  readonly passport: DatasetPassport;
  /** Hashes are supplied by the loader after reading the exact files. */
  readonly fileHashes: Readonly<Record<string, string>>;
}

export interface VerifiedResearchDataset extends LabDataset {
  readonly grade: "real";
  readonly passport: DatasetPassport;
  readonly dqgFindings: readonly DqgFinding[];
  readonly verifiedAdmission: true;
}

/**
 * Acceptance-grade admission is deliberately separate from LabDataset. A
 * caller-supplied `grade: real` is never a provenance proof.
 */
export function admitResearchDataset(input: ResearchDatasetAdmissionInput): VerifiedResearchDataset {
  if (!verifyPassport(input.passport)) throw new Error("dataset Passport hash verification failed");
  for (const file of input.passport.files) {
    const actual = input.fileHashes[file.path];
    if (!actual || actual !== file.sha256) {
      throw new Error(`dataset Passport file hash mismatch: ${file.path}`);
    }
  }
  const provenance = { parserVersion: input.passport.parserVersion, buildSha: input.passport.collectorSha };
  const findings = [
    ...checkTicks(input.ticks.map((tick) => toTickRow(tick, provenance))),
    ...checkProposals(input.proposals.map((proposal) => toProposalRow(proposal, provenance))),
  ];
  if (blocksDataset(findings)) throw new Error("Dataset Quality Gate blocked acceptance-grade admission");
  if (input.passport.totalRows !== input.ticks.length + input.proposals.length) {
    throw new Error("dataset Passport row count does not match admitted partitions");
  }
  return Object.freeze({
    ticks: [...input.ticks],
    proposals: [...input.proposals],
    datasetHash: input.passport.manifestHash,
    grade: "real",
    passport: input.passport,
    dqgFindings: findings,
    verifiedAdmission: true,
  });
}

function hasVerifiedAdmission(dataset: LabDataset): boolean {
  return dataset.grade === "real" && dataset.verifiedAdmission === true &&
    dataset.passport !== undefined && verifyPassport(dataset.passport) &&
    dataset.dqgFindings !== undefined && !blocksDataset([...dataset.dqgFindings]);
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
  /** OOS expectancy under a 20% payout haircut (robustness probe). */
  readonly oosStressedExpectancy: number | null;
  /** Winner expectancy per fold: dev search best, validation measure, test OOS. */
  readonly walkForward: {
    readonly dev: number | null;
    readonly validation: number | null;
    readonly test: number | null;
  };
  /** Constant-CALL baseline expectancy on the dev fold (same expiry). */
  readonly devBaselineExpectancy: number | null;
  readonly oosDegradation: number | null;
  readonly sensitivityStable: boolean;
  readonly variantsTried: number;
  readonly calibrationAdequate: boolean;
  readonly calibrationBrier: number | null;
  readonly edgeGate: {
    readonly pass: number;
    readonly fail: number;
    readonly unknown: number;
    readonly threshold: number;
    readonly safetyMargin: number;
    readonly safetyMarginVersion: string;
  };
  readonly edgeDiagnostics: readonly {
    readonly time: number;
    readonly runnerId: string;
    readonly pHat: number | null;
    readonly pBe: number | null;
    readonly edge: number | null;
    readonly evPerStake: number | null;
    readonly verdict: "PASS" | "FAIL" | "UNKNOWN";
  }[];
  readonly walkForwardFolds: readonly {
    readonly fold: number;
    readonly trainStart: number;
    readonly trainEnd: number;
    readonly validationStart: number;
    readonly validationEnd: number;
    readonly testStart: number;
    readonly testEnd: number;
    readonly validationExpectancy: number | null;
    readonly testExpectancy: number | null;
  }[];
  readonly stress: ResearchStressSummary;
}

export interface ResearchStressSummary {
  readonly payoutDeterioration: number | null;
  readonly proposalLatencyUnknownFraction: number;
  readonly tickThinningSignalCount: number;
  readonly gapInjectionUnknownFraction: number;
  readonly regimeExpectancies: readonly (number | null)[];
  readonly instrumentRemovalExpectancy: number | null;
  readonly blockBootstrap: {
    readonly seed: number;
    readonly blockSize: number;
    readonly samples: number;
    readonly mean: number | null;
    readonly lower: number | null;
    readonly upper: number | null;
  };
}

/** Deterministic stress/sequence-risk artifacts over a measured fold. */
export function runStressSuite(
  decisions: readonly SettledDecision[],
  seed: number,
  payoutHaircut = 0.2,
): ResearchStressSummary {
  const resolved = decisions.filter((d) => d.signal !== "NO_SIGNAL" && d.label !== "UNKNOWN" && d.label !== "FLAT");
  const known = resolved.filter((d) => d.realized !== null);
  const values = known.map((d) => d.realized as number);
  const mean = (items: readonly number[]): number | null => items.length === 0 ? null : items.reduce((a, b) => a + b, 0) / items.length;
  const samples: number[] = [];
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const blockSize = Math.max(1, Math.min(10, Math.floor(Math.sqrt(Math.max(1, values.length)))));
  for (let sample = 0; sample < 32; sample += 1) {
    const resampled: number[] = [];
    while (resampled.length < values.length && values.length > 0) {
      const start = Math.floor(next() * values.length);
      for (let offset = 0; offset < blockSize && resampled.length < values.length; offset += 1) {
        resampled.push(values[(start + offset) % values.length] ?? 0);
      }
    }
    const value = mean(resampled);
    if (value !== null) samples.push(value);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number): number | null => sorted.length === 0 ? null : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? null;
  const byHalf = [resolved.slice(0, Math.ceil(resolved.length / 2)), resolved.slice(Math.ceil(resolved.length / 2))];
  const instruments = [...new Set(resolved.map((d) => d.instrument))].sort();
  const removedInstrument = instruments[0];
  const remainingAfterRemoval = removedInstrument === undefined
    ? []
    : resolved.filter((d) => d.instrument !== removedInstrument).flatMap((d) => d.realized === null ? [] : [d.realized]);
  return {
    payoutDeterioration: stressedExpectancy(decisions, payoutHaircut),
    proposalLatencyUnknownFraction: decisions.length === 0 ? 0 : decisions.filter((d) => d.proposalAgeMs === null).length / decisions.length,
    tickThinningSignalCount: resolved.filter((_d, index) => index % 2 === 0).length,
    gapInjectionUnknownFraction: decisions.length === 0 ? 0 : (decisions.length - resolved.length) / decisions.length,
    regimeExpectancies: byHalf.map((part) => mean(part.flatMap((d) => d.realized === null ? [] : [d.realized]))),
    instrumentRemovalExpectancy: removedInstrument === undefined ? null : mean(remainingAfterRemoval),
    blockBootstrap: {
      seed,
      blockSize,
      samples: samples.length,
      mean: mean(samples),
      lower: percentile(0.05),
      upper: percentile(0.95),
    },
  };
}

export const OOS_EDGE_SAFETY_MARGIN_VERSION = "oos-edge-margin-1";
export const OOS_EDGE_SAFETY_MARGIN = 0.02;

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
  legacyOrPresetVersion: string,
  maybePresetVersion?: string,
): ReplayRunner {
  const presetVersion = maybePresetVersion ?? legacyOrPresetVersion;
  const runnerId = `${engine.strategyId}_${String(profile.expirySeconds)}s`;
  return {
    strategyId: engine.strategyId,
    strategyVersion: engine.strategyVersion,
    runnerId,
    expirySeconds: profile.expirySeconds,
    presetVersion,
    decide: ({ symbol, features: snapshot }) => {
      const output = engine.evaluate({
        strategyId: engine.strategyId,
        strategyVersion: engine.strategyVersion,
        runnerId,
        runner: {
          strategyId: engine.strategyId as StrategyId,
          expirySeconds: profile.expirySeconds,
          executionProfile: "research" as ExecutionProfileId,
        },
        // The replay event is authoritative. The optional legacy symbol
        // parameter remains only for source compatibility and is never used.
        instrument: symbol,
        expirySeconds: profile.expirySeconds,
        decisionTime: new Date(snapshot.eventTime * 1000).toISOString(),
        decisionTimeMs: snapshot.eventTime * 1000,
        features: snapshot,
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
 * Passive directional baseline (F6): always CALL at replay cadence. Measures
 * raw directional exposure so a winner must beat doing something dumb, not
 * just doing nothing. Never a strategy family, never ENABLED.
 */
function constantCallRunner(expirySeconds: 60 | 180 | 300): ReplayRunner {
  return {
    strategyId: "baseline_constant_call",
    strategyVersion: "1.0.0",
    runnerId: `baseline_constant_call_${String(expirySeconds)}s`,
    expirySeconds,
    presetVersion: "baseline-1",
    decide: () => ({ signal: "SIGNAL_CALL", quality: 0, reason: "passive baseline exposure" }),
  };
}

/** Shared synthetic economics policy: keys join only within the TTL. */
function labEconomics(): {
  readonly version: string;
  readonly proposalTtlMs: number;
  readonly amount: number;
  readonly currency: string;
  readonly basis: string;
} {
  return {
    version: REPLAY_ECONOMICS_VERSION,
    proposalTtlMs: DEFAULT_PROPOSAL_TTL_MS,
    amount: 10,
    currency: "USD",
    basis: "stake",
  };
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
  readonly verifiedAdmission?: boolean;
  readonly calibrationAdequate?: boolean;
  readonly edgePass?: number;
  readonly edgeFail?: number;
  readonly edgeUnknown?: number;
}): { state: ProfileState; reason: string } {
  const verifiedAdmission = args.verifiedAdmission ?? args.grade === "real";
  const calibrationAdequate = args.calibrationAdequate ?? true;
  const edgePass = args.edgePass ?? 1;
  const edgeFail = args.edgeFail ?? 0;
  const edgeUnknown = args.edgeUnknown ?? 0;
  if (args.grade === "synthetic") {
    return {
      state: "RETEST_REQUIRED",
      reason: "synthetic fixture coverage only; needs real proposal-aware history",
    };
  }
  if (!verifiedAdmission) {
    return {
      state: "RETEST_REQUIRED",
      reason: "real-data verdict blocked: verified Passport and clean DQG admission are required",
    };
  }
  if (!calibrationAdequate) {
    return { state: "RETEST_REQUIRED", reason: "calibration is inadequate for OOS acceptance" };
  }
  if (edgePass <= 0 || edgeFail > 0 || edgeUnknown > 0) {
    return { state: "RETEST_REQUIRED", reason: "OOS Edge Gate did not pass for every signal" };
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
  const devSearchCapability = capabilityFor(cycle, "dev", "search");
  const devCalibrationCapability = capabilityFor(cycle, "dev", "calibration");
  const validationMeasureCapability = capabilityFor(cycle, "validation", "measure");
  const finalMeasureCapability = lock.measurementCapability(cycle);
  const verdicts: ProfileVerdict[] = [];
  const metricsByProfile: Record<string, ProfileMetrics> = {};
  const symbols = [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))].sort();
  const symbol = symbols[0] ?? "SYNTH";
  const tolerance = options.settlementToleranceSeconds ?? 10;

  // Passive baselines (F6): constant-CALL exposure per expiry on the dev fold.
  // Shared across profiles of the same expiry; recorded as measure attempts so
  // any winner can be weighed against doing something dumb at the same cadence.
  const devTicks = dataset.ticks.filter(
    (t) => t.eventTime >= split.dev.start && t.eventTime < split.dev.end,
  );
  const baselineByExpiry = new Map<number, number | null>();
  for (const expiry of [60, 180, 300] as const) {
    const output = runReplay({
      mode: "proposal-aware",
      ticks: devTicks,
      proposals: dataset.proposals,
      runners: [constantCallRunner(expiry)],
      fromTime: split.dev.start,
      toTime: split.dev.end,
      stepTicks: 5,
      settlementToleranceSeconds: tolerance,
      flatEpsilon: 0,
      economics: labEconomics(),
      codeVersion: options.codeVersion,
      datasetHash: dataset.datasetHash,
      datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
      featureVersion: "sfg-1",
      configHash: options.configHash,
      seed: options.seed + 900 + expiry,
    });
    const metrics = computeMetrics(
      output.decisions,
      output.decisions.map((d) => d.effectivePayout),
      output.decisions.map((d) => d.breakEven),
    );
    baselineByExpiry.set(expiry, metrics.expectancyPerStake);
    ledger.attempts.push({
      cycleVersion: cycle,
      strategy: "baseline:constant_call",
      expirySeconds: expiry,
      variantIndex: 0,
      preset: { direction: "CALL" },
      presetHash: presetHash({ direction: "CALL" }),
      configHash: options.configHash,
      fold: "dev",
      access: "measure",
      signals: metrics.signals,
      expectancy: metrics.expectancyPerStake,
    });
  }

  for (const profile of profiles) {
    const key = profileKey(profile);
    const seed = seedPreset(profile);
    const searchPolicy = searchSpaceIdentity(profile);
    const variants = searchWithCapability(devSearchCapability, () => gridVariants(seed.preset, searchSpace(profile)));
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
        economics: labEconomics(),
        codeVersion: options.codeVersion,
        datasetHash: dataset.datasetHash,
        datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
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
        presetHash: presetHash(variant),
        configHash: options.configHash,
        fold: "dev",
        access: "search",
        signals: metrics.signals,
        expectancy: metrics.expectancyPerStake,
        searchPolicyId: searchPolicy.profileId,
        searchPolicyHash: searchPolicy.policyHash,
      });
      const candidate = metrics.expectancyPerStake ?? Number.NEGATIVE_INFINITY;
      const best = bestExpectancy ?? Number.NEGATIVE_INFINITY;
      if (candidate > best) {
        bestExpectancy = metrics.expectancyPerStake;
        bestVariant = index;
      }
    }
    // Untouched OOS with the winning variant (read-only measurement).
    const winner = variants[bestVariant] ?? seed.preset;
    const oosEngine = makeEngine(profile.strategy, winner);
    const oos = measureWithCapability(finalMeasureCapability, () => lock.measure(() =>
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
        economics: labEconomics(),
        codeVersion: options.codeVersion,
        datasetHash: dataset.datasetHash,
        datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
        featureVersion: "sfg-1",
        configHash: options.configHash,
        seed: options.seed + 1000,
      })),
    );
    const oosMetrics = computeMetrics(
      oos.decisions,
      oos.decisions.map((d) => d.effectivePayout),
      oos.decisions.map((d) => d.breakEven),
    );
    metricsByProfile[key] = oosMetrics;
    // Fold-tagged measurement ledger (F4/F7): every non-search fold access is
    // recorded. The test fold is measured exactly once, never searched.
    const winnerHash = presetHash(winner);
    ledger.attempts.push({
      cycleVersion: cycle,
      strategy: profile.strategy,
      expirySeconds: profile.expirySeconds,
      variantIndex: bestVariant,
      preset: winner,
      presetHash: winnerHash,
      configHash: options.configHash,
      fold: "test",
      access: "measure",
      signals: oosMetrics.signals,
      expectancy: oosMetrics.expectancyPerStake,
      searchPolicyId: searchPolicy.profileId,
      searchPolicyHash: searchPolicy.policyHash,
    });
    const devExpectancy = bestExpectancy ?? 0;
    const oosExp = oosMetrics.expectancyPerStake ?? 0;
    const degradation =
      devExpectancy === 0 ? null : Math.max(0, (devExpectancy - oosExp) / Math.abs(devExpectancy));
    // Walk-forward leg (F6): winner measured on the validation fold (measure,
    // never search) alongside dev-best and test OOS.
    const validationMetrics = measureWithCapability(validationMeasureCapability, () =>
      runOnce(dataset, profile, winner, split.validation, symbol, options),
    );
    ledger.attempts.push({
      cycleVersion: cycle,
      strategy: profile.strategy,
      expirySeconds: profile.expirySeconds,
      variantIndex: bestVariant,
      preset: winner,
      presetHash: winnerHash,
      configHash: options.configHash,
      fold: "validation",
      access: "measure",
      signals: validationMetrics.signals,
      expectancy: validationMetrics.expectancyPerStake,
      searchPolicyId: searchPolicy.profileId,
      searchPolicyHash: searchPolicy.policyHash,
    });
    // Sensitivity: perturb the winning preset one step per dimension on dev.
    const sensitivityStable = checkSensitivity(dataset, profile, winner, split, options);
    // Calibration availability probe on dev-fold decisions (diagnostic only;
    // p_hat stays null in outputs until real evidence justifies it).
    const calibrationProbe = devCalibrationSamples(dataset, profile, winner, split, symbol, options);
    ledger.attempts.push({
      cycleVersion: cycle,
      strategy: profile.strategy,
      expirySeconds: profile.expirySeconds,
      variantIndex: bestVariant,
      preset: winner,
      presetHash: winnerHash,
      configHash: options.configHash,
      fold: "dev",
      access: "calibration",
      signals: calibrationProbe.signals,
      expectancy: null,
      searchPolicyId: searchPolicy.profileId,
      searchPolicyHash: searchPolicy.policyHash,
    });
    const calibration = calibrateWithCapability(devCalibrationCapability, () => fitCalibration(calibrationProbe.samples));
    const stress = runStressSuite(oos.decisions, options.seed + profile.expirySeconds);
    let edgePass = 0;
    let edgeFail = 0;
    let edgeUnknown = 0;
    const edgeDiagnostics: ProfileVerdict["edgeDiagnostics"][number][] = [];
    for (const decision of oos.decisions) {
      if (decision.signal === "NO_SIGNAL") continue;
      const pHat = calibrateScore(calibration, decision.quality);
      const edge = evaluateEdge({
        askPrice: decision.askPrice ?? null,
        payout: decision.payout ?? null,
        pHat,
        threshold: 0.8,
        safetyMargin: OOS_EDGE_SAFETY_MARGIN,
      });
      edgeDiagnostics.push({
        time: decision.time,
        runnerId: decision.runnerId,
        pHat,
        pBe: edge.pBe,
        edge: edge.probabilityEdge,
        evPerStake: edge.evPerStake,
        verdict: edge.verdict,
      });
      if (edge.verdict === "PASS") edgePass += 1;
      else if (edge.verdict === "FAIL") edgeFail += 1;
      else edgeUnknown += 1;
    }
    const verdict = verdictFor({
      oosExpectancy: oosMetrics.expectancyPerStake,
      oosExpectancyCi: oosMetrics.expectancyCi,
      oosSignals: oosMetrics.signals,
      oosDegradation: degradation,
      sensitivityStable,
      grade: dataset.grade,
      minOosSignals: options.minOosSignals ?? 30,
      verifiedAdmission: hasVerifiedAdmission(dataset),
      calibrationAdequate: calibration.adequate,
      edgePass,
      edgeFail,
      edgeUnknown,
    });
    const rollingWindows = rollingWalkForward(split.dev.start, split.test.start);
    const walkForwardFolds = rollingWindows.map((window) => ({
      fold: window.fold,
      trainStart: window.train.start,
      trainEnd: window.train.end,
      validationStart: window.validation.start,
      validationEnd: window.validation.end,
      testStart: window.test.start,
      testEnd: window.test.end,
      validationExpectancy: runOnce(dataset, profile, winner, window.validation, symbol, options).expectancyPerStake,
      testExpectancy: runOnce(dataset, profile, winner, window.test, symbol, options).expectancyPerStake,
    }));
    verdicts.push({
      profile,
      state: verdict.state,
      reason: verdict.reason,
      oosSignals: oosMetrics.signals,
      oosExpectancy: oosMetrics.expectancyPerStake,
      oosExpectancyCi: oosMetrics.expectancyCi,
      oosStressedExpectancy: stressedExpectancy(oos.decisions, 0.2),
      walkForward: {
        dev: bestExpectancy,
        validation: validationMetrics.expectancyPerStake,
        test: oosMetrics.expectancyPerStake,
      },
      devBaselineExpectancy: baselineByExpiry.get(profile.expirySeconds) ?? null,
      oosDegradation: degradation,
      sensitivityStable,
      variantsTried: variants.length,
      calibrationAdequate: calibration.adequate,
      calibrationBrier: calibration.brier,
      edgeGate: {
        pass: edgePass,
        fail: edgeFail,
        unknown: edgeUnknown,
        threshold: 0.8,
        safetyMargin: OOS_EDGE_SAFETY_MARGIN,
        safetyMarginVersion: OOS_EDGE_SAFETY_MARGIN_VERSION,
      },
      edgeDiagnostics,
      walkForwardFolds,
      stress,
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
): { samples: { score: number; won: boolean }[]; signals: number } {
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
    economics: labEconomics(),
    codeVersion: options.codeVersion,
    datasetHash: dataset.datasetHash,
    datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
    featureVersion: "sfg-1",
    configHash: options.configHash,
    seed: options.seed + 500,
  });
  const samples: { score: number; won: boolean }[] = [];
  let signals = 0;
  for (const decision of output.decisions) {
    if (decision.signal === "NO_SIGNAL") continue;
    signals += 1;
    if (decision.label === "UNKNOWN" || decision.label === "FLAT") {
      continue;
    }
    samples.push({
      score: decision.quality,
      won:
        (decision.signal === "SIGNAL_CALL" && decision.label === "UP") ||
        (decision.signal === "SIGNAL_PUT" && decision.label === "DOWN"),
    });
  }
  return { samples, signals };
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
  if (base.expectancyPerStake === null) return true;
  for (const dim of space.slice(0, 2)) {
    for (const delta of [-dim.step, dim.step]) {
      const current = winner[dim.param];
      if (typeof current !== "number") continue;
      const perturbed = { ...winner, [dim.param]: Math.round((current + delta) * 1e6) / 1e6 };
      const candidate = runOnce(dataset, profile, perturbed, split.validation, symbol, options);
      if (candidate.expectancyPerStake === null) continue;
      // Knife-edge: sign flip of expectancy on a single step.
      if (Math.sign(base.expectancyPerStake) !== Math.sign(candidate.expectancyPerStake) && Math.abs(base.expectancyPerStake) > 1e-9) return false;
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
): ProfileMetrics {
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
    economics: labEconomics(),
    codeVersion: options.codeVersion,
    datasetHash: dataset.datasetHash,
    datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
    featureVersion: "sfg-1",
    configHash: options.configHash,
    seed: options.seed,
  });
  const metrics = computeMetrics(
    output.decisions,
    output.decisions.map((d) => d.effectivePayout),
    output.decisions.map((d) => d.breakEven),
  );
  return metrics;
}

export type { SettledDecision, ReplayDecision };
