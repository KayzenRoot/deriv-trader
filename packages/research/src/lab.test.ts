import { describe, expect, it } from "vitest";
import { generateProposals, generateTicks } from "./dataset.js";
import { runLab, type LabDataset } from "./lab.js";
import { admitResearchDataset } from "./lab.js";
import { createPassport, fileSha256 } from "./passport.js";
import { ALL_PROFILES } from "@deriv-trader/strategies";

function labDataset(): LabDataset {
  const ticks = [
    ...generateTicks({
      symbol: "SYNTH_A",
      startEpoch: 1_700_000_000,
      ticks: 1200,
      basePrice: 100,
      seed: 11,
      regimes: ["trend_up", "range", "trend_down", "range", "breakout_up"],
    }),
    ...generateTicks({
      symbol: "SYNTH_B",
      startEpoch: 1_700_000_000,
      ticks: 1200,
      basePrice: 500,
      seed: 22,
      regimes: ["range", "trend_down", "range", "trend_up"],
    }),
  ];
  const proposals = generateProposals({
    symbols: ["SYNTH_A", "SYNTH_B"],
    expiries: [60, 180, 300],
    effectivePayout: 0.9,
    startEpoch: 1_700_000_000,
    everyTicks: 25,
  });
  return { ticks, proposals, datasetHash: "lab-fixture-v1", grade: "synthetic" };
}

describe("quant lab pipeline", () => {
  it("researches all 15 profiles with ledger and honest verdicts", () => {
    const run = runLab(labDataset(), {
      seed: 99,
      codeVersion: "test-1",
      configHash: "cfg-test",
    });
    expect(run.verdicts).toHaveLength(15);
    expect(new Set(run.verdicts.map((v) => `${v.profile.strategy}_${String(v.profile.expirySeconds)}`))).toHaveLength(15);
    // Synthetic grade caps everything at RETEST_REQUIRED; nothing ENABLED.
    for (const verdict of run.verdicts) {
      expect(verdict.state).toBe("RETEST_REQUIRED");
      expect(verdict.reason).toContain("synthetic");
    }
    expect(run.ledger.attempts.length).toBeGreaterThan(15);
    // The sealed test fold is measured exactly once per profile, never
    // searched: tuning access stays on dev, measurement on validation/test.
    expect(run.ledger.attempts.every((a) => a.fold !== "test" || a.access === "measure")).toBe(true);
    expect(run.ledger.attempts.some((a) => a.fold === "test" && a.access === "measure")).toBe(true);
    expect(run.ledger.attempts.every((a) => a.cycleVersion.length > 0)).toBe(true);
    // Every verdict carries the walk-forward triple, payout stress and baseline.
    for (const verdict of run.verdicts) {
      expect(verdict.walkForward).toBeDefined();
      expect(verdict.oosStressedExpectancy === null || typeof verdict.oosStressedExpectancy === "number").toBe(true);
      expect(
        verdict.devBaselineExpectancy === null || typeof verdict.devBaselineExpectancy === "number",
      ).toBe(true);
    }
  }, 300000);

  it("keeps expiry profiles isolated and versioned", () => {
    const run = runLab(labDataset(), {
      seed: 99,
      codeVersion: "test-1",
      configHash: "cfg-test",
    }, ALL_PROFILES.filter((p) => p.strategy === "trend_pulse"));
    expect(run.verdicts).toHaveLength(3);
    const expiries = run.verdicts.map((v) => v.profile.expirySeconds).sort((a, b) => a - b);
    expect(expiries).toEqual([60, 180, 300]);
  }, 300000);

  it("does not trust a caller-supplied real grade without verified admission", () => {
    const profile = ALL_PROFILES[0];
    if (!profile) throw new Error("missing test profile");
    const run = runLab({ ...labDataset(), grade: "real" }, {
      seed: 99,
      codeVersion: "test-1",
      configHash: "cfg-test",
      minOosSignals: 0,
    }, [profile]);
    expect(run.verdicts[0]?.state).toBe("RETEST_REQUIRED");
    expect(run.verdicts[0]?.reason).toContain("verified Passport");
  }, 300000);

  it("admits only Passport-bound partitions with a clean DQG", () => {
    const source = labDataset();
    const tickBytes = new TextEncoder().encode("ticks");
    const proposalBytes = new TextEncoder().encode("proposals");
    const passport = createPassport({
      datasetId: "admission-test",
      createdAt: "2026-09-19T00:00:00.000Z",
      collectorSha: "test-sha",
      parserVersion: "test-parser",
      sourceEndpoints: [],
      environment: "test",
      symbols: ["SYNTH_A", "SYNTH_B"],
      timeRange: { start: "2023-11-14T22:13:20.000Z", end: "2023-11-14T22:33:20.000Z" },
      files: [
        { path: "ticks.parquet", sha256: fileSha256(tickBytes), rows: source.ticks.length },
        { path: "proposals.parquet", sha256: fileSha256(proposalBytes), rows: source.proposals.length },
      ],
    });
    const admitted = admitResearchDataset({
      ticks: source.ticks,
      proposals: source.proposals,
      passport,
      fileHashes: { "ticks.parquet": fileSha256(tickBytes), "proposals.parquet": fileSha256(proposalBytes) },
    });
    expect(admitted.verifiedAdmission).toBe(true);
    expect(admitted.datasetHash).toBe(passport.manifestHash);
    const firstTick = source.ticks[0];
    const firstFile = passport.files[0];
    if (!firstTick || !firstFile) throw new Error("missing admission fixture");
    expect(() => admitResearchDataset({
      ticks: [{ ...firstTick, quote: 0 }],
      proposals: [],
      passport: createPassport({ ...passport, files: [{ ...firstFile, rows: 1 }] }),
      fileHashes: { "ticks.parquet": fileSha256(tickBytes), "proposals.parquet": fileSha256(proposalBytes) },
    })).toThrow();
  });
});
