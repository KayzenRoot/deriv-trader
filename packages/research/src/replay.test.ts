import { describe, expect, it } from "vitest";
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";
import { generateProposals, generateTicks } from "./dataset.js";
import {
  DEFAULT_PROPOSAL_TTL_MS,
  joinProposal,
  digestReplayDecisions,
  REPLAY_ECONOMICS_VERSION,
  runReplay,
  settle,
  type ReplayRunner,
} from "./replay.js";
import { chronologicalSplit, FinalTestLock, foldOf, overlaps, rollingWalkForward } from "./splits.js";

function dataset(seed = 42): { ticks: MarketTick[]; proposals: ProposalQuote[] } {
  const ticks = generateTicks({
    symbol: "SYNTH",
    startEpoch: 1_700_000_000,
    ticks: 600,
    basePrice: 100,
    seed,
    regimes: ["trend_up", "range", "trend_down", "range"],
  });
  const proposals = generateProposals({
    symbols: ["SYNTH"],
    expiries: [60],
    effectivePayout: 0.9,
    startEpoch: 1_700_000_000,
    everyTicks: 20,
  });
  return { ticks, proposals };
}

function callRunner(): ReplayRunner {
  return {
    strategyId: "test_call",
    strategyVersion: "1.0.0",
    runnerId: "test_call_60s",
    expirySeconds: 60,
    presetVersion: "seed-1",
    decide: () => ({ signal: "SIGNAL_CALL", quality: 0.6, reason: "test" }),
  };
}

const BASE = {
  mode: "proposal-aware" as const,
  runners: [callRunner()],
  fromTime: 1_700_000_000,
  toTime: 1_700_000_599,
  stepTicks: 10,
  settlementToleranceSeconds: 10,
  flatEpsilon: 0,
  economics: {
    version: REPLAY_ECONOMICS_VERSION,
    proposalTtlMs: DEFAULT_PROPOSAL_TTL_MS,
    amount: 10,
    currency: "USD",
    basis: "stake",
  },
  codeVersion: "test-1",
  datasetHash: "ds-test",
  featureVersion: "sfg-1",
  configHash: "cfg-test",
  seed: 7,
};

describe("deterministic replay", () => {
  it("repeats to identical decisions and manifests", () => {
    const { ticks, proposals } = dataset();
    const first = runReplay({ ...BASE, ticks, proposals });
    const second = runReplay({ ...BASE, ticks, proposals });
    expect(second.manifest.decisionsHash).toBe(first.manifest.decisionsHash);
    expect(second.decisions).toEqual(first.decisions);
    expect(first.decisions.length).toBeGreaterThan(0);
  });

  it("ignores future data (no lookahead)", () => {
    const { ticks, proposals } = dataset();
    const full = runReplay({ ...BASE, ticks, proposals });
    const truncated = runReplay({
      ...BASE,
      ticks: ticks.filter((t) => t.eventTime < 1_700_000_300),
      proposals,
      toTime: 1_700_000_299,
    });
    // Compare only decisions whose entire settlement window (target + 10s
    // tolerance) survives truncation; boundary decisions legitimately differ
    // because their settlement evidence was cut, not because inputs leaked.
    const fullEarly = full.decisions.filter((d) => d.targetTime + 10 <= 1_700_000_299);
    const truncatedEarly = truncated.decisions.filter((d) => d.targetTime + 10 <= 1_700_000_299);
    expect(truncatedEarly).toEqual(fullEarly);
    expect(truncatedEarly.length).toBeGreaterThan(0);
  });

  it("joins only proposals available at decision time", () => {
    const { ticks, proposals } = dataset();
    const future = proposals.map((q) => ({
      ...q,
      receivedAt: new Date(9_999_999_999_000).toISOString(),
    }));
    const output = runReplay({ ...BASE, ticks, proposals: future });
    expect(output.decisions.every((d) => d.effectivePayout === null)).toBe(true);
    // Same key, one past + one future: the past snapshot wins.
    const key = proposals[0]?.key ?? "";
    const at = Date.parse(proposals[0]?.receivedAt ?? "") + 1;
    expect(joinProposal(proposals, key, at, DEFAULT_PROPOSAL_TTL_MS)?.proposalId).toBe(
      proposals[0]?.proposalId,
    );
    expect(joinProposal(future, key, at, DEFAULT_PROPOSAL_TTL_MS)).toBeNull();
    // Stale by TTL: the same past quote no longer counts as evidence.
    expect(joinProposal(proposals, key, at + DEFAULT_PROPOSAL_TTL_MS + 1000, DEFAULT_PROPOSAL_TTL_MS)).toBeNull();
  });

  it("labels UNKNOWN when settlement evidence is thin", () => {
    const { label } = settle([], "SYNTH", 100, 1_700_000_100, 10, 0);
    expect(label).toBe("UNKNOWN");
    const { ticks } = dataset();
    const near = ticks.filter((t) => t.eventTime >= 1_700_000_100 && t.eventTime <= 1_700_000_105);
    const far = settle(near, "SYNTH", 100, 1_700_100_000, 5, 0);
    expect(far.label).toBe("UNKNOWN");
  });

  it("market-only replay never claims monetary expectancy", () => {
    const { ticks, proposals } = dataset();
    const output = runReplay({ ...BASE, mode: "market-only", ticks, proposals });
    expect(output.decisions.every((d) => d.realized === null)).toBe(true);
    expect(output.decisions.some((d) => d.points !== null)).toBe(true);
  });

  it("delivers the actual symbol to a shared replay runner", () => {
    const a = generateTicks({ symbol: "A", startEpoch: 1_700_000_000, ticks: 80, basePrice: 100, seed: 1, regimes: ["trend_up"] });
    const b = generateTicks({ symbol: "B", startEpoch: 1_700_000_000, ticks: 80, basePrice: 200, seed: 2, regimes: ["trend_down"] });
    const seen: string[] = [];
    const output = runReplay({
      ...BASE,
      ticks: [...a, ...b],
      proposals: [],
      runners: [{ ...callRunner(), decide: ({ symbol }) => { seen.push(symbol); return { signal: "NO_SIGNAL", quality: 0, reason: "probe" }; } }],
      mode: "market-only",
      toTime: 1_700_000_079,
    });
    expect(output.decisions.map((d) => d.instrument)).toContain("A");
    expect(output.decisions.map((d) => d.instrument)).toContain("B");
    expect(new Set(seen)).toEqual(new Set(["A", "B"]));
  });

  it("canonical digest changes for material proposal and settlement fields", () => {
    const { ticks, proposals } = dataset();
    const first = runReplay({ ...BASE, ticks, proposals });
    const changed = first.decisions.map((decision, index) => index === 0 ? { ...decision, proposalAgeMs: (decision.proposalAgeMs ?? 0) + 1, realized: decision.realized === null ? 0 : decision.realized } : decision);
    expect(digestReplayDecisions(changed, { ...BASE, datasetPassportHash: "passport-a" })).not.toBe(
      digestReplayDecisions(first.decisions, { ...BASE, datasetPassportHash: "passport-a" }),
    );
  });
});

describe("chronological splits and final-test lock", () => {
  it("rejects overlapping ranges", () => {
    const split = chronologicalSplit(0, 1000, 0.6, 0.2);
    expect(split.dev).toEqual({ start: 0, end: 600 });
    expect(split.validation).toEqual({ start: 600, end: 800 });
    expect(split.test).toEqual({ start: 800, end: 1000 });
    expect(overlaps(split.dev, split.test)).toBe(false);
    expect(() => chronologicalSplit(0, 100, 0.6, 0.5)).toThrow();
    expect(foldOf(split, 700)).toBe("validation");
    expect(foldOf(split, 900)).toBe("test");
    expect(foldOf(split, 100)).toBe("dev");
  });

  it("rejects tuning against the sealed final test", () => {
    const lock = new FinalTestLock({ start: 800, end: 1000 });
    expect(lock.tune("probe", () => 1)).toBe(1);
    lock.seal();
    expect(() => lock.tune("retune", () => 2)).toThrow(/final-test tuning rejected/);
    expect(lock.measure(() => 3)).toBe(3);
    expect(lock.contains(900)).toBe(true);
    expect(lock.contains(700)).toBe(false);
  });

  it("builds rolling walk-forward windows without crossing the sealed range", () => {
    const windows = rollingWalkForward(0, 800);
    expect(windows).toHaveLength(2);
    expect(windows[0]?.train).toEqual({ start: 0, end: 300 });
    expect(windows[0]?.validation).toEqual({ start: 300, end: 500 });
    expect(windows[0]?.test).toEqual({ start: 500, end: 700 });
    expect(windows[1]?.test.end).toBe(800);
    for (const window of windows) {
      expect(overlaps(window.train, window.validation)).toBe(false);
      expect(overlaps(window.train, window.test)).toBe(false);
      expect(overlaps(window.validation, window.test)).toBe(false);
    }
  });
});
