import { describe, expect, it } from "vitest";
import type { MarketTick, StrategyId, ExecutionProfileId } from "@deriv-trader/domain";
import {
  computeFeatures,
  hashSnapshot,
  SharedFeatureGraph,
  FEATURE_VERSION,
} from "./features.js";
import { evaluateEdge } from "./edge.js";
import { preflight, PREFLIGHT_MIN_BARS } from "./engine.js";
import { decideTrendPulse, presetSchema as trendPreset } from "./trend-pulse.js";
import { decideMeanSnapback, presetSchema as snapbackPreset } from "./mean-snapback.js";
import { decideBreakoutSurge, presetSchema as breakoutPreset } from "./breakout-surge.js";
import { decideAnchorPullback, presetSchema as pullbackPreset } from "./anchor-pullback.js";
import { decideMicroPressure, presetSchema as microPreset } from "./micro-pressure.js";
import { seedPreset, gridVariants, searchSpace, searchSpaceIdentity, ALL_PROFILES } from "./presets.js";
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

/** Deep dip then flat: canonical snapback shape (40 flat, 20 falling, 10 flat). */
function snapDip(): number[] {
  const quotes: number[] = [];
  for (let i = 0; i < 40; i += 1) quotes.push(100 + (i % 2 === 0 ? 0.02 : -0.02));
  for (let i = 0; i < 20; i += 1) quotes.push(100 - i * 0.12);
  for (let i = 0; i < 10; i += 1) quotes.push(97.6);
  return quotes;
}

/** Compression then steady climb: breakout shape (56 flat, 14 climbing). */
function breakSpike(): number[] {
  const quotes: number[] = [];
  for (let i = 0; i < 56; i += 1) quotes.push(100 + (i % 2 === 0 ? 0.02 : -0.02));
  for (let i = 0; i < 14; i += 1) quotes.push(100 + i * 0.09);
  return quotes;
}

/**
 * Pullback shape: 45-tick uptrend, 4-tick dip, 10-tick recovery.
 * Fires CALL while displaced (indices 52-53), silent before resumption (50)
 * and after the pre-dip extreme is reclaimed (54).
 */
function pullbackShape(): number[] {
  const quotes: number[] = [];
  for (let i = 0; i < 45; i += 1) quotes.push(100 + i * 0.05);
  for (let i = 0; i < 4; i += 1) quotes.push(102.25 - i * 0.15);
  for (let i = 0; i < 10; i += 1) quotes.push(101.65 + i * 0.12);
  return quotes;
}

/** Steady micro-grind: +0.04% per tick over 70 ticks. */
function grindShape(): number[] {
  const quotes: number[] = [];
  let price = 100;
  for (let i = 0; i < 70; i += 1) {
    price *= 1.0004;
    quotes.push(price);
  }
  return quotes;
}

/** Strategy input from an explicit quote array evaluated at a tick index. */
function quotesInput(quotes: number[], atIndex: number): StrategyInput {
  const history = ticks("SYNTH", quotes);
  const at = 1_700_000_000 + atIndex;
  const snapshot = computeFeatures(history, "SYNTH", at, "test");
  if (!snapshot) throw new Error("fixture too short");
  return {
    strategyId: "test",
    strategyVersion: "1.0.0",
    runnerId: "test_60s",
    runner: {
      strategyId: "test" as StrategyId,
      expirySeconds: 60,
      executionProfile: "research" as ExecutionProfileId,
    },
    instrument: "SYNTH",
    expirySeconds: 60,
    decisionTime: new Date(at * 1000).toISOString(),
    decisionTimeMs: at * 1000,
    features: snapshot,
    provenance: "test",
    proposal: null,
    proposalAgeMs: null,
    presetVersion: "seed-1",
    configVersion: "test-1",
  };
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
    // Thin history still snapshots (no fabrication), but flags windowBars so
    // the strategy preflight below can refuse it. Only empty history is null.
    const thin = computeFeatures(history.slice(0, 10), "SYNTH", at, "test");
    expect(thin).not.toBeNull();
    expect(thin?.windowBars).toBeLessThan(PREFLIGHT_MIN_BARS);
    expect(computeFeatures([], "SYNTH", at, "test")).toBeNull();
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

  it("excludes stale ticks openly and fails closed on a stale latest tick", () => {
    const history = trendUp();
    const at = 1_700_000_000 + 69;
    // A stale tick mid-history never enters windows but is counted.
    const withStaleMid = history.map((t, i) => (i === 30 ? { ...t, stale: true } : t));
    const mid = computeFeatures(withStaleMid, "SYNTH", at, "test");
    const clean = computeFeatures(history, "SYNTH", at, "test");
    expect(mid?.excludedTicks).toBe(1);
    expect(mid?.windowBars).toBe((clean?.windowBars ?? 0) - 1);
    expect(mid?.freshness).toBe("FRESH");
    // ...but a stale LATEST tick marks the snapshot UNTRUSTED and preflight
    // refuses it before any family logic.
    const withStaleLatest = history.map((t, i) => (i === history.length - 1 ? { ...t, stale: true } : t));
    const latest = computeFeatures(withStaleLatest, "SYNTH", at, "test");
    expect(latest?.freshness).toBe("UNTRUSTED");
    if (!latest) throw new Error("fixture too short");
    const blocked = preflight({ ...inputFor("SYNTH", at), features: latest });
    expect(blocked?.signal).toBe("NO_SIGNAL");
    expect(blocked?.noSignalCode).toBe("UNTRUSTED_INPUT");
  });

  it("marks continuity anomalies anywhere inside the active window", () => {
    const history = trendUp().map((tick, index) => index === 60 ? { ...tick, gap: true } : tick);
    const snapshot = computeFeatures(history, "SYNTH", 1_700_000_069, "test");
    expect(snapshot?.freshness).toBe("GAPPED");
    expect(snapshot?.continuity.gapCount).toBeGreaterThan(0);
  });
});

describe("trend pulse", () => {
  const preset = trendPreset.parse({});
  it("refuses thin windows in preflight before any family logic", () => {
    const history = trendUp();
    const at = 1_700_000_000 + 69;
    // Fresh but thin: decision time matches the slice end so only the
    // window-depth gate can fire.
    const thinAt = 1_700_000_000 + 9;
    const thin = computeFeatures(history.slice(0, 10), "SYNTH", thinAt, "test");
    if (!thin) throw new Error("fixture too short");
    const input = { ...inputFor("SYNTH", thinAt), features: thin };
    const blocked = preflight(input);
    expect(blocked?.signal).toBe("NO_SIGNAL");
    expect(blocked?.noSignalCode).toBe("INSUFFICIENT_HISTORY");
    // Full windows pass preflight (null = not blocked).
    expect(preflight(inputFor("SYNTH", at))).toBeNull();
  });
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
  // Seed default entryZ (1.5) is deliberately conservative: the canonical dip
  // does not stretch far enough, so it stays silent. An explicit research
  // preset (entryZ 0.5) fires CALL on the dip and PUT on its mirror.
  const research = { ...preset, entryZ: 0.5, maxRangePosition: 1 as const };
  it("fires CALL on the dip and PUT on its mirror under the research preset", () => {
    const quotes = snapDip();
    const call = decideMeanSnapback(quotesInput(quotes, quotes.length - 1), research);
    expect(call.signal).toBe("SIGNAL_CALL");
    expect(decideMeanSnapback(quotesInput(quotes, quotes.length - 1), preset).signal).toBe("NO_SIGNAL");
    const mirrored = quotes.map((q) => 200 - q);
    const put = decideMeanSnapback(quotesInput(mirrored, mirrored.length - 1), research);
    expect(put.signal).toBe("SIGNAL_PUT");
  });
});

describe("breakout surge", () => {
  const preset = breakoutPreset.parse({});
  it("holds fire without directional hold, fires once the break holds", () => {
    const quotes = breakSpike();
    const early = decideBreakoutSurge(quotesInput(quotes, 62), preset);
    expect(early.signal).toBe("NO_SIGNAL");
    expect(early.noSignalCode).toBe("WEAK_HOLD");
    const confirmed = decideBreakoutSurge(quotesInput(quotes, 64), preset);
    expect(confirmed.signal).toBe("SIGNAL_CALL");
    // Pure chop without compression must not fire.
    const flat = computeFeatures(chop(), "SYNTH", 1_700_000_000 + 69, "test");
    if (!flat) throw new Error("fixture too short");
    const quiet = decideBreakoutSurge(inputFor("SYNTH", 1_700_000_000 + 69, flat.values), preset);
    expect(quiet.signal).toBe("NO_SIGNAL");
  });
});

describe("anchor pullback", () => {
  const preset = pullbackPreset.parse({});
  it("enters on resumption, silent before and after the displacement", () => {
    const quotes = pullbackShape();
    const falling = decideAnchorPullback(quotesInput(quotes, 50), preset);
    expect(falling.signal).toBe("NO_SIGNAL");
    expect(falling.noSignalCode).toBe("NO_RESUMPTION");
    expect(decideAnchorPullback(quotesInput(quotes, 52), preset).signal).toBe("SIGNAL_CALL");
    expect(decideAnchorPullback(quotesInput(quotes, 53), preset).signal).toBe("SIGNAL_CALL");
    const reclaimed = decideAnchorPullback(quotesInput(quotes, 54), preset);
    expect(reclaimed.signal).toBe("NO_SIGNAL");
    expect(reclaimed.noSignalCode).toBe("NO_PULLBACK");
    // Mirrored downtrend pullback must mirror the direction.
    const mirrored = quotes.map((q) => 200 - q);
    expect(decideAnchorPullback(quotesInput(mirrored, 52), preset).signal).toBe("SIGNAL_PUT");
    // Chop has no trend to pull back from.
    const flat = computeFeatures(chop(), "SYNTH", 1_700_000_000 + 69, "test");
    if (!flat) throw new Error("fixture too short");
    expect(decideAnchorPullback(inputFor("SYNTH", 1_700_000_000 + 69, flat.values), preset).signal).toBe(
      "NO_SIGNAL",
    );
  });
});

describe("micro pressure", () => {
  const preset = microPreset.parse({});
  it("fires on persistent imbalance, silent on chop", () => {
    expect(decideMicroPressure(quotesInput(grindShape(), 69), preset).signal).toBe("SIGNAL_CALL");
    const flatHistory = chop();
    const flatSnapshot = computeFeatures(flatHistory, "SYNTH", 1_700_000_000 + 69, "test");
    if (!flatSnapshot) throw new Error("fixture too short");
    const up = inputFor("SYNTH", 1_700_000_000 + 69);
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
  it("covers 15 profiles with expiry-specific seed identity and exact budget", () => {
    expect(ALL_PROFILES).toHaveLength(15);
    const seen = new Set<string>();
    for (const profile of ALL_PROFILES) {
      const seed = seedPreset(profile);
      expect(typeof seed.preset).toBe("object");
      expect(seed.version).toContain(profile.strategy);
      expect(seed.version).toContain(`${String(profile.expirySeconds)}s`);
      expect(searchSpace(profile.strategy).length).toBeGreaterThan(0);
      // Independent addressability: no two profiles share one identity.
      expect(seen.has(seed.version)).toBe(false);
      seen.add(seed.version);
      expect(seen.has(seed.hash)).toBe(false);
      seen.add(seed.hash);
      expect(searchSpaceIdentity(profile).profileId).toBe(`${profile.strategy}_${String(profile.expirySeconds)}s`);
      expect(searchSpace(profile).every((dimension) => dimension.profileId === searchSpaceIdentity(profile).profileId)).toBe(true);
    }
    expect(seen.size).toBe(30);
    const variants = gridVariants(seedPreset({ strategy: "trend_pulse", expirySeconds: 60 }).preset, [
      { param: "minSlope", min: 0.0001, max: 0.0003, step: 0.0001 },
    ]);
    // Strict total budget including the seed (F15).
    expect(variants.length).toBeLessThanOrEqual(12);
    expect(variants[0]).toEqual(seedPreset({ strategy: "trend_pulse", expirySeconds: 60 }).preset);
  });
});
