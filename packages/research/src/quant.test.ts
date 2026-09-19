import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fitCalibration, calibrateScore } from "./calibration.js";
import { computeMetrics, wilson, meanCi } from "./metrics.js";
import { orderSignals, simulate, SIMULATOR_POLICY_VERSION } from "./simulator.js";
import { emptyLedger, verdictFor } from "./lab.js";
import type { SettledDecision } from "./replay.js";

function decision(overrides: Partial<SettledDecision> = {}): SettledDecision {
  return {
    time: 1_700_000_000,
    signal: "SIGNAL_CALL",
    strategyId: "s",
    instrument: "SYNTH",
    expirySeconds: 60,
    presetVersion: "seed-1",
    featureHash: "h",
    quality: 0.6,
    proposalKey: null,
    effectivePayout: 0.9,
    breakEven: 10 / 19,
    reason: "test",
    targetTime: 1_700_000_060,
    label: "UP",
    realized: 0.9,
    points: 1,
    ...overrides,
  };
}

describe("calibration separation", () => {
  it("returns null when evidence is insufficient, math when adequate", () => {
    const thin = fitCalibration([{ score: 0.7, won: true }]);
    expect(thin.adequate).toBe(false);
    expect(calibrateScore(thin, 0.7)).toBeNull();
    const samples = [];
    for (let i = 0; i < 200; i += 1) {
      samples.push({ score: 0.1 + (i % 5) * 0.2, won: i % 3 !== 0 });
    }
    const fitted = fitCalibration(samples);
    expect(fitted.adequate).toBe(true);
    expect(fitted.brier).not.toBeNull();
    const p = calibrateScore(fitted, 0.5);
    expect(p).not.toBeNull();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe("metrics honesty", () => {
  it("computes hit rate, expectancy and risk with CIs", () => {
    const decisions = [
      decision({ label: "UP", realized: 0.9 }),
      decision({ label: "DOWN", realized: -1 }),
      decision({ signal: "NO_SIGNAL", reason: "chop", realized: null, points: null }),
      decision({ label: "UNKNOWN", realized: null, points: null }),
    ];
    const metrics = computeMetrics(
      decisions,
      [0.9, 0.9, null, null],
      [10 / 19, 10 / 19, null, null],
    );
    expect(metrics.signals).toBe(3);
    expect(metrics.noSignal).toBe(1);
    expect(metrics.wins).toBe(1);
    expect(metrics.losses).toBe(1);
    expect(metrics.unknowns).toBe(1);
    expect(metrics.hitRate).toBe(0.5);
    expect(metrics.hitRateCi?.[0]).toBeLessThanOrEqual(0.5);
    expect(metrics.expectancyPerStake).toBeCloseTo(-0.05, 10);
    expect(metrics.monetary).toBe(true);
    expect(metrics.longestLossRun).toBe(1);
  });

  it("market-only decisions stay non-monetary", () => {
    const decisions = [decision({ realized: null, points: 1, effectivePayout: null })];
    const metrics = computeMetrics(decisions, [null], [null]);
    expect(metrics.monetary).toBe(false);
    expect(metrics.expectancyPerStake).toBeNull();
    expect(metrics.expectancyCi).toBeNull();
  });

  it("wilson and mean CIs bracket honestly", () => {
    expect(wilson(0.5, 0)).toEqual([0, 0]);
    const [low, high] = wilson(0.6, 100);
    expect(low).toBeLessThan(0.6);
    expect(high).toBeGreaterThan(0.6);
    expect(meanCi([1])).toBeNull();
    expect(meanCi([1, 2, 3])).not.toBeNull();
  });
});

describe("verdict rules", () => {
  it("caps synthetic evidence at RETEST_REQUIRED", () => {
    const verdict = verdictFor({
      oosExpectancy: 0.5,
      oosExpectancyCi: [0.4, 0.6],
      oosSignals: 500,
      oosDegradation: 0,
      sensitivityStable: true,
      grade: "synthetic",
      minOosSignals: 30,
    });
    expect(verdict.state).toBe("RETEST_REQUIRED");
  });

  it("rejects negative real OOS and passes strong real OOS", () => {
    const rejected = verdictFor({
      oosExpectancy: 0.1,
      oosExpectancyCi: [-0.1, 0.3],
      oosSignals: 200,
      oosDegradation: 0,
      sensitivityStable: true,
      grade: "real",
      minOosSignals: 30,
    });
    expect(rejected.state).toBe("REJECTED");
    const passed = verdictFor({
      oosExpectancy: 0.2,
      oosExpectancyCi: [0.05, 0.35],
      oosSignals: 200,
      oosDegradation: 0.1,
      sensitivityStable: true,
      grade: "real",
      minOosSignals: 30,
    });
    expect(passed.state).toBe("OOS_PASSED");
    expect(emptyLedger().attempts).toEqual([]);
  });
});

describe("portfolio simulator rules", () => {
  const policy = {
    version: SIMULATOR_POLICY_VERSION,
    maxSimultaneous: 2,
    maxPerInstrument: 1,
    cooldownSeconds: 120,
    dailyStopLoss: 5,
    dailyTarget: null,
    fixedStake: 1,
  };
  it("enforces slots, instrument caps, cooldown and deterministic order", () => {
    const signals = [
      { time: 100, runnerId: "b", instrument: "X", expirySeconds: 60 as const, signal: "SIGNAL_CALL" as const, realized: 0.9 },
      { time: 100, runnerId: "a", instrument: "X", expirySeconds: 60 as const, signal: "SIGNAL_CALL" as const, realized: 0.9 },
      { time: 100, runnerId: "c", instrument: "Y", expirySeconds: 60 as const, signal: "SIGNAL_PUT" as const, realized: -1 },
      // Slots free again after t=160 expiry; cooldown (120s) still binds a/X.
      { time: 170, runnerId: "a", instrument: "X", expirySeconds: 60 as const, signal: "SIGNAL_CALL" as const, realized: 0.9 },
    ];
    const ordered = orderSignals(signals);
    expect(ordered[0]?.runnerId).toBe("a");
    const metrics = simulate(ordered, policy);
    // a+X and c+Y fill (2 slots); b+X blocked by instrument cap; a+X@110 in cooldown.
    expect(metrics.fills).toBe(2);
    expect(metrics.blockedInstrument).toBe(1);
    expect(metrics.blockedCooldown).toBe(1);
    expect(metrics.maxSimultaneousUsed).toBe(2);
  });

  it("applies daily stop without a stale queue", () => {
    const signals = [];
    for (let i = 0; i < 8; i += 1) {
      signals.push({
        time: 100 + i * 200,
        runnerId: "a",
        instrument: "X",
        expirySeconds: 60 as const,
        signal: "SIGNAL_PUT" as const,
        realized: -1,
      });
    }
    const metrics = simulate(orderSignals(signals), { ...policy, cooldownSeconds: 0 });
    expect(metrics.blockedDaily).toBeGreaterThan(0);
    expect(metrics.worstLossCluster).toBeGreaterThanOrEqual(5);
  });
});

describe("strategy boundary enforcement", () => {
  it("strategies cannot import risk, execution or Deriv adapter", () => {
    const pkg = JSON.parse(
      readFileSync("packages/strategies/package.json", "utf8"),
    ) as { dependencies: Record<string, string> };
    const forbidden = [
      "@deriv-trader/risk",
      "@deriv-trader/execution",
      "@deriv-trader/deriv-adapter",
      "@deriv-trader/auth",
      "@deriv-trader/connections",
      "@deriv-trader/secret-store",
      "@deriv-trader/db",
    ];
    for (const dep of forbidden) expect(pkg.dependencies[dep]).toBeUndefined();
  });

  it("strategy family files import nothing outside domain/zod/engine", () => {
    const files = [
      "trend-pulse",
      "mean-snapback",
      "breakout-surge",
      "anchor-pullback",
      "micro-pressure",
    ];
    for (const family of files) {
      const source = readFileSync(`packages/strategies/src/${family}.ts`, "utf8");
      const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
      for (const spec of imports) {
        const allowed =
          spec === "zod" ||
          spec === "./engine.js" ||
          spec.startsWith("@deriv-trader/domain");
        expect(allowed, `${family} imports ${spec}`).toBe(true);
      }
    }
  });

  it("no cross-strategy voting exists", () => {
    const families = [
      ["trend-pulse", "decideTrendPulse"],
      ["mean-snapback", "decideMeanSnapback"],
      ["breakout-surge", "decideBreakoutSurge"],
      ["anchor-pullback", "decideAnchorPullback"],
      ["micro-pressure", "decideMicroPressure"],
    ] as const;
    for (const [family] of families) {
      const source = readFileSync(`packages/strategies/src/${family}.ts`, "utf8");
      const others = families.filter(([other]) => other !== family).map(([, fn]) => fn);
      for (const fn of others) expect(source.includes(fn)).toBe(false);
      expect(source.toLowerCase().includes("confluence")).toBe(false);
    }
  });
});
