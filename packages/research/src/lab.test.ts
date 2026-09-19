import { describe, expect, it } from "vitest";
import { generateProposals, generateTicks } from "./dataset.js";
import { runLab, type LabDataset } from "./lab.js";
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
    expect(run.ledger.attempts.every((a) => a.fold !== "test")).toBe(true);
    expect(run.ledger.attempts.every((a) => a.cycleVersion.length > 0)).toBe(true);
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
});
