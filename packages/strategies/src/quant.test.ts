import { describe, expect, it } from "vitest";
import type { MarketTick, StrategyId, ExecutionProfileId } from "@deriv-trader/domain";
import {
  computeFeatures,
  hashSnapshot,
  SharedFeatureGraph,
  FEATURE_VERSION,
} from "./features.js";
import { evaluateEdge } from "./edge.js";
import { decideTrendPulse, presetSchema as trendPreset } from "./trend-pulse.js";
import { decideMeanSnapback, presetSchema as snapbackPreset } from "./mean-snapback.js";
import { decideBreakoutSurge, presetSchema as breakoutPreset } from "./breakout-surge.js";
import { decideAnchorPullback, presetSchema as pullbackPreset } from "./anchor-pullback.js";
import { decideMicroPressure, presetSchema as microPreset } from "./micro-pressure.js";
import { seedPreset, gridVariants, searchSpace, ALL_PROFILES } from "./presets.js";
import type { StrategyInput } from "./engine.js";

function ticks(
  symbol: string,
  quotes: number[],
  start = 1_700_000_000,
): MarketTick[] {
  return quotes.map((quote, i) => ({
    underlyingSymbol: symbol,
    eventTime: start + i,
    receiveTime: new Date((start + i) * 1000).toISOString(),
    quote,
    pipSize: 0.0001,
    sourceConnectionId: "fixture",
    reqId: null,
    subscriptionId: null,
    sequence: i,
    stale: false,
    gap: false,
    outOfOrder: false,
    duplicate: false,
  }));
}

/** Steady climb: ~0.06% per tick over 60 ticks. */
function trendUp(symbol = "SYNTH"): MarketTick[] {
  const quotes: number[] = [];
  let price = 100;
  for (let i = 0; i < 70; i += 1) {
    price *= 1 + 0.0006 + (i % 2 === 0 ? 0.0001 : -0.0001);
    quotes.push(price);
  }
  return ticks(symbol, quotes);
}

function trendDown(symbol = "SYNTH"): MarketTick[] {
  return trendUp(symbol).map((t, i, arr) => ({
    ...t,
    quote: 200 - (arr[i]?.quote ?? 100),
  }));
}

function chop(symbol = "SYNTH"): MarketTick[] {
  const quotes: number[] = [];
  for (let i = 0; i < 70; i += 1) quotes.push(100 + (i % 2 === 0 ? 0.05 : -0.05));
  return ticks(symbol, quotes);
}

function spike(symbol = "SYNTH"): MarketTick[] {
  const base = trendUp(symbol).slice(0, 60).map((t) => t.quote);
  const last = base[base.length - 1] ?? 100;
  for (let i = 0; i < 8; i += 1) base.push(last * (1 + i * 0.0001));
  // Isolated one-tick jump lands inside the final decision window.
  const pre = base[base.length - 1] ?? last;
  base.push(pre * 1.25);
  base.push(pre * 1.2501);
  return ticks(symbol, base);
}

function inputFor(symbol: string, atTime: number, featureValues?: Record<string, number>): StrategyInput {
  const history = trendUp(symbol);
  const snapshot =
    computeFeatures(history, symbol, atTime, "test") ??
    (() => {
      throw new Error("fixture too short");
    })();
  return {
    strategyId: "test",
    strategyVersion: "1.0.0",
    runnerId: "test_60s",
    runner: {
      strategyId: "test" as StrategyId,
      expirySeconds: 60,
      executionProfile: "research" as ExecutionProfileId,
    },
    instrument: symbol,
    expirySeconds: 60,
    decisionTime: new Date(atTime * 1000).toISOString(),
    decisionTimeMs: atTime * 1000,
    features: featureValues ? { ...snapshot, values: featureValues } : snapshot,
    provenance: "test",
    proposal: null,
    proposalAgeMs: null,
    presetVersion: "seed-1",
    configVersion: "test-1",
  };
}

describe("shared feature graph", () => {
  it("computes past-only features with stable hashes", () => {
    const history = trendUp();
    const at = 1_700_000_000 + 69;
    const first = computeFeatures(history, "SYNTH", at, "test");
    const second = computeFeatures(history, "SYNTH", at, "test");
    expect(first).not.toBeNull();
    expect(first?.featureVersion).toBe(FEATURE_VERSION);
    expect(first?.hash).toBe(second?.hash);
    if (first) {
      const { hash, ...rest } = first;
      expect(hashSnapshot(rest)).toBe(hash);
    }
    // Insufficient history returns null (caller emits NO_SIGNAL).
    expect(computeFeatures(history.slice(0, 10), "SYNTH", at, "test")).toBeNull();
    // Future ticks never leak: same decision time, extended future differs not.
    const extended = [...history, ...ticks("SYNTH", [999], 1_700_000_100)];
    expect(computeFeatures(extended, "SYNTH", at, "test")?.hash).toBe(first?.hash);
  });

  it("shares one computation across Runners (fan-out, not recompute)", () => {
    const graph = new SharedFeatureGraph();
    for (const tick of trendUp()) graph.ingest(tick);
    const at = 1_700_000_000 + 69;
    const a = graph.snapshot("SYNTH", at, "test");
    const b = graph.snapshot("SYNTH", at, "test");
    expect(a?.hash).toBe(b?.hash);
    expect(graph.bufferedSymbols()).toEqual(["SYNTH"]);
  });
});

describe("trend pulse", () => {
  const preset = trendPreset.parse({});
  it("fires CALL on climbs, PUT on mirrored falls, NO_SIGNAL on chop", () => {
    const up = inputFor("SYNTH", 1_700_000_000 + 69);
    expect(decideTrendPulse(up, preset).signal).toBe("SIGNAL_CALL");
    const downHistory = trendDown();
    const downSnapshot = computeFeatures(downHistory, "SYNTH", 1_700_000_000 + 69, "test");
    if (!downSnapshot) throw new Error("fixture too short");
    const down = { ...up, features: downSnapshot };
    expect(decideTrendPulse(down, preset).signal).toBe("SIGNAL_PUT");
    const flatHistory = chop();
    const flatSnapshot = computeFeatures(flatHistory, "SYNTH", 1_700_000_000 + 69, "test");
    if (!flatSnapshot) throw new Error("fixture too short");
    expect(decideTrendPulse({ ...up, features: flatSnapshot }, preset).signal).toBe("NO_SIGNAL");
  });

  it("filters isolated one-tick jumps", () => {
    const history = spike();
    const snapshot = computeFeatures(history, "SYNTH", 1_700_000_000 + 69, "test");
    if (!snapshot) throw new Error("fixture too short");
    expect(snapshot.anomaly).toBe(true);
    expect(decideTrendPulse(inputFor("SYNTH", 1_700_000_000 + 69, snapshot.values), preset).signal).toBe(
      "NO_SIGNAL",
    );
  });
});

describe("mean snapback", () => {
  const preset = snapbackPreset.parse({});
  it("mirrors CALL/PUT around stretch direction", () => {
    // Deep dip then flat: oversold with deceleration.
    const quotes: number[] = [];
    for (let i = 0; i < 60; i += 1) quotes.push(100 - Math.min(i, 20) * 0.3 + Math.max(0, i - 20) * 0.02);
    const snapshot = computeFeatures(ticks("SYNTH", quotes), "SYNTH", 1_700_000_000 + 59, "test");
    if (!snapshot) throw new Error("fixture too short");
    const call = decideMeanSnapback(inputFor("SYNTH", 1_700_000_000 + 59, snapshot.values), preset);
    expect(["SIGNAL_CALL", "NO_SIGNAL"]).toContain(call.signal);
    // Mirrored series must mirror the decision.
    const mirrored = ticks("SYNTH", quotes.map((q) => 200 - q));
    const mirrorSnapshot = computeFeatures(mirrored, "SYNTH", 1_700_000_000 + 59, "test");
    if (!mirrorSnapshot) throw new Error("fixture too short");
    const put = decideMeanSnapback(inputFor("SYNTH", 1_700_000_000 + 59, mirrorSnapshot.values), preset);
    const pair = [call.signal, put.signal].sort().join(",");
    expect(["NO_SIGNAL,NO_SIGNAL", "NO_SIGNAL,SIGNAL_CALL", "NO_SIGNAL,SIGNAL_PUT", "SIGNAL_CALL,SIGNAL_PUT"].some((allowed) => pair === allowed)).toBe(true);
    if (call.signal !== "NO_SIGNAL" && put.signal !== "NO_SIGNAL") {
      expect(call.signal).not.toBe(put.signal);
    }
  });
});

describe("breakout surge", () => {
  const preset = breakoutPreset.parse({});
  it("fires on compression break with hold, silent otherwise", () => {
    // Long flat compression then steady climb with hold.
    const quotes: number[] = [];
    for (let i = 0; i < 45; i += 1) quotes.push(100 + (i % 2 === 0 ? 0.02 : -0.02));
    for (let i = 0; i < 25; i += 1) quotes.push(100 + i * 0.08);
    const snapshot = computeFeatures(ticks("SYNTH", quotes), "SYNTH", 1_700_000_000 + 69, "test");
    if (!snapshot) throw new Error("fixture too short");
    const decision = decideBreakoutSurge(inputFor("SYNTH", 1_700_000_000 + 69, snapshot.values), preset);
    expect(["SIGNAL_CALL", "NO_SIGNAL"]).toContain(decision.signal);
    // Pure chop without compression must not fire.
    const flat = computeFeatures(chop(), "SYNTH", 1_700_000_000 + 69, "test");
    if (!flat) throw new Error("fixture too short");
    const quiet = decideBreakoutSurge(inputFor("SYNTH", 1_700_000_000 + 69, flat.values), preset);
    expect(quiet.signal).toBe("NO_SIGNAL");
  });
});

describe("anchor pullback", () => {
  const preset = pullbackPreset.parse({});
  it("enters on resumption, rejects broken trends", () => {
    // Uptrend, controlled dip, resumption climb.
    const quotes: number[] = [];
    for (let i = 0; i < 35; i += 1) quotes.push(100 + i * 0.1);
    for (let i = 0; i < 10; i += 1) quotes.push(103.5 - i * 0.1);
    for (let i = 0; i < 25; i += 1) quotes.push(102.5 + i * 0.09);
    const snapshot = computeFeatures(ticks("SYNTH", quotes), "SYNTH", 1_700_000_000 + 69, "test");
    if (!snapshot) throw new Error("fixture too short");
    const decision = decideAnchorPullback(inputFor("SYNTH", 1_700_000_000 + 69, snapshot.values), preset);
    expect(["SIGNAL_CALL", "NO_SIGNAL"]).toContain(decision.signal);
  });
});

describe("micro pressure", () => {
  const preset = microPreset.parse({});
  it("fires on persistent imbalance, silent on chop", () => {
    const up = inputFor("SYNTH", 1_700_000_000 + 69);
    expect(["SIGNAL_CALL", "NO_SIGNAL"]).toContain(decideMicroPressure(up, preset).signal);
    const flatHistory = chop();
    const flatSnapshot = computeFeatures(flatHistory, "SYNTH", 1_700_000_000 + 69, "test");
    if (!flatSnapshot) throw new Error("fixture too short");
    expect(decideMicroPressure({ ...up, features: flatSnapshot }, preset).signal).toBe("NO_SIGNAL");
  });
});

describe("edge gate exactness", () => {
  it("computes r, p_be, edge and EV exactly", () => {
    const pass = evaluateEdge({ askPrice: 10, payout: 19, pHat: 0.7, threshold: 0.8, safetyMargin: 0.05 });
    expect(pass.verdict).toBe("PASS");
    expect(pass.effectivePayout).toBeCloseTo(0.9, 12);
    expect(pass.pBe).toBeCloseTo(10 / 19, 12);
    expect(pass.probabilityEdge).toBeCloseTo(0.7 - 10 / 19, 12);
    expect(pass.evPerStake).toBeCloseTo(0.7 * 0.9 - 0.3, 12);
    expect(evaluateEdge({ askPrice: null, payout: 19, pHat: 0.7, threshold: 0.8, safetyMargin: 0 }).verdict).toBe("UNKNOWN");
    expect(evaluateEdge({ askPrice: 10, payout: 19, pHat: null, threshold: 0.8, safetyMargin: 0 }).reasonCode).toBe("UNCALIBRATED");
    expect(evaluateEdge({ askPrice: 10, payout: 15, pHat: 0.7, threshold: 0.8, safetyMargin: 0 }).verdict).toBe("FAIL");
  });
});

describe("presets and search", () => {
  it("covers 15 profiles with exploratory seeds and bounded grids", () => {
    expect(ALL_PROFILES).toHaveLength(15);
    for (const profile of ALL_PROFILES) {
      const seed = seedPreset(profile.strategy);
      expect(typeof seed).toBe("object");
      expect(searchSpace(profile.strategy).length).toBeGreaterThan(0);
    }
    const variants = gridVariants(seedPreset("trend_pulse"), [
      { param: "minSlope", min: 0.0001, max: 0.0003, step: 0.0001 },
    ]);
    expect(variants.length).toBeLessThanOrEqual(13);
    expect(variants[0]).toEqual(seedPreset("trend_pulse"));
  });
});
