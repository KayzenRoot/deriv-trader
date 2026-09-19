import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "@deriv-trader/config";
import type {
  ActiveInstrument,
  ContractCapability,
  MarketDataSource,
  MarketTick,
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import { proposalKey } from "@deriv-trader/domain";
import { MarketScannerRuntime } from "./runtime.js";

function makeClock(start = 1_700_000_000_000): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return { nowMs: () => now, advance: (ms: number) => { now += ms; } };
}

function instrument(symbol: string): ActiveInstrument {
  return {
    underlyingSymbol: symbol,
    name: symbol,
    type: "forex",
    market: "forex",
    submarket: "major_pairs",
    pipSize: 0.0001,
    exchangeOpen: true,
    tradingSuspended: false,
    tradeCount: 2,
  };
}

function capability(symbol: string, type: string): ContractCapability {
  return {
    underlyingSymbol: symbol,
    contractCategory: "callput",
    contractType: type,
    expiryType: "intraday",
    sentiment: "up",
    barriers: 0,
    market: "forex",
    submarket: "major_pairs",
  };
}

function quoteFor(assumptions: ProposalAssumptions, effective: number | null): ProposalQuote {
  return {
    key: proposalKey(assumptions),
    assumptions,
    proposalId: effective === null ? null : `p-${assumptions.underlyingSymbol}-${String(assumptions.durationSeconds)}`,
    askPrice: effective === null ? null : 10,
    payout: effective === null ? null : 10 * (1 + effective),
    effectivePayout: effective,
    breakEven: effective === null ? null : 10 / (10 * (1 + effective)),
    state: effective === null ? "UNKNOWN" : "KNOWN",
    requestedAt: new Date(0).toISOString(),
    receivedAt: new Date(0).toISOString(),
    source: "fixture",
  };
}

interface FixtureControl {
  readonly source: MarketDataSource;
  readonly sends: () => number;
  readonly subscribes: () => string[];
  readonly emitTick: (symbol: string, eventTime: number, quote: number) => void;
  readonly setQuoter: (quoter: (a: ProposalAssumptions) => ProposalQuote) => void;
}

function fixtureTransport(symbols: string[]): FixtureControl {
  let sends = 0;
  const subscribes: string[] = [];
  const handlers = new Map<string, (tick: MarketTick) => void>();
  let quoter: (a: ProposalAssumptions) => ProposalQuote = (a) => quoteFor(a, 0.9);
  const source: MarketDataSource = {
    getActiveSymbols: () => Promise.resolve(symbols.map((s) => instrument(s))),
    getContractsFor: (symbol: string) =>
      Promise.resolve([capability(symbol, "CALL"), capability(symbol, "PUT")]),
    subscribeTicks: (symbol: string, handler: (tick: MarketTick) => void) => {
      subscribes.push(symbol);
      handlers.set(symbol, handler);
      return Promise.resolve({
        subscriptionId: `sub:${symbol}`,
        unsubscribe: () => {
          handlers.delete(symbol);
          return Promise.resolve();
        },
      });
    },
    getTicksHistory: () => Promise.resolve([]),
    requestProposal: (assumptions: ProposalAssumptions) => {
      sends += 1;
      return Promise.resolve(quoter(assumptions));
    },
    forget: () => Promise.resolve(true),
    forgetAll: () => Promise.resolve(),
  };
  return {
    source,
    sends: () => sends,
    subscribes: () => [...subscribes],
    emitTick: (symbol: string, eventTime: number, quote: number) => {
      handlers.get(symbol)?.({
        underlyingSymbol: symbol,
        eventTime,
        receiveTime: new Date(eventTime * 1000).toISOString(),
        quote,
        pipSize: null,
        sourceConnectionId: "fixture",
        reqId: null,
        subscriptionId: `sub:${symbol}`,
        sequence: 0,
        stale: false,
        gap: false,
        outOfOrder: false,
        duplicate: false,
      });
    },
    setQuoter: (next: (a: ProposalAssumptions) => ProposalQuote) => {
      quoter = next;
    },
  };
}

function testConfig(overrides: Record<string, string> = {}): ReturnType<typeof loadConfig> {
  return loadConfig({
    CAPTURE_ROLL_MS: "1000",
    CAPTURE_BATCH_ROWS: "500",
    ...overrides,
  });
}

describe("assembled MarketScannerRuntime", () => {
  it("progresses connect -> discovery -> probes -> ticks -> lattice (populated)", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD", "R_100"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-rt-")),
    });
    await runtime.connect();
    expect(runtime.registry.size()).toBe(2);
    const probes = await runtime.probeExpiries();
    expect(probes.proven).toBeGreaterThan(0);
    await runtime.ensureTicks();
    expect(runtime.hub.externalCount()).toBe(2);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    fixture.emitTick("R_100", 1_700_000_100, 501);
    clock.advance(2000);
    await runtime.scannerCycle();
    const lattice = runtime.lattice();
    expect(lattice.count).toBeGreaterThan(0);
    expect(lattice.eligible).toBeGreaterThan(0);
    expect(runtime.snapshotState().quotes).toBeGreaterThan(0);
    const market = runtime.statusMarket();
    expect(market.symbolsTotal).toBe(2);
    expect(market.subscribedSymbols).toEqual(["R_100", "frxEURUSD"]);
    await runtime.stop();
  });

  it("proves and revokes 60/180/300 support from outcomes, never guessed", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-rt-")),
    });
    fixture.setQuoter((a) => quoteFor(a, a.durationSeconds === 60 ? 0.9 : null));
    await runtime.connect();
    await runtime.probeExpiries();
    expect(runtime.registry.isProven("frxEURUSD", "CALL", 60)).toBe(true);
    expect(runtime.registry.isProven("frxEURUSD", "PUT", 60)).toBe(true);
    await runtime.probeExpiries();
    await runtime.probeExpiries();
    const lattice = runtime.lattice();
    const expiries = new Set(lattice.opportunities.map((o) => o.expirySeconds));
    expect(expiries.has(60)).toBe(true);
    expect(expiries.has(180)).toBe(false);
    expect(expiries.has(300)).toBe(false);
    await runtime.stop();
  });

  it("proves directions independently: CALL success never proves PUT", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-rt-")),
    });
    // CALL 60s valid while PUT 60s rejects; PUT 180s valid while CALL rejects.
    fixture.setQuoter((a) => {
      if (a.contractType === "CALL" && a.durationSeconds === 60) return quoteFor(a, 0.9);
      if (a.contractType === "PUT" && a.durationSeconds === 180) return quoteFor(a, 0.9);
      return quoteFor(a, null);
    });
    await runtime.connect();
    await runtime.probeExpiries();
    await runtime.probeExpiries();
    await runtime.probeExpiries();
    expect(runtime.registry.isProven("frxEURUSD", "CALL", 60)).toBe(true);
    expect(runtime.registry.isProven("frxEURUSD", "PUT", 60)).toBe(false);
    expect(runtime.registry.isProven("frxEURUSD", "PUT", 180)).toBe(true);
    expect(runtime.registry.isProven("frxEURUSD", "CALL", 180)).toBe(false);
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    clock.advance(1000);
    const lattice = runtime.lattice();
    const put60 = lattice.opportunities.filter(
      (o) => o.direction === "PUT" && o.expirySeconds === 60,
    );
    // Unproven PUT 60s has no snapshots at all: unsupported directions never
    // appear, let alone as ELIGIBLE.
    expect(put60).toHaveLength(0);
    const call60 = lattice.opportunities.filter(
      (o) => o.direction === "CALL" && o.expirySeconds === 60,
    );
    expect(call60).toHaveLength(1);
    expect(call60[0]?.eligibility).toBe("ELIGIBLE");
    expect(call60[0]?.proposalKey).toContain("CALL");
    expect(typeof call60[0]?.breakEven).toBe("number");
    await runtime.stop();
  });

  it("keeps CALL/PUT cache keys independent by direction and expiry", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-rt-")),
    });
    await runtime.connect();
    await runtime.probeExpiries(["frxEURUSD"]);
    const state = runtime.snapshotState();
    const keys = new Set(
      state.snapshots.map((s) => `${s.underlyingSymbol}|${s.direction}|${String(s.expirySeconds)}`),
    );
    expect(keys.size).toBe(state.snapshots.length);
    expect(state.quotes).toBeGreaterThan(0);
    await runtime.stop();
  });

  it("restores tick subscriptions exactly once after reconnect and recovers", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD", "R_100"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-rt-")),
    });
    await runtime.connect();
    await runtime.ensureTicks();
    expect(runtime.hub.externalCount()).toBe(2);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    expect(runtime.hub.freshness("frxEURUSD", true)).toBe("FRESH");
    // Socket close with 2 active symbols: stale invalidation, then restore.
    runtime.hub.invalidateAll();
    expect(runtime.hub.freshness("frxEURUSD", true)).toBe("STALE");
    const before = fixture.subscribes().length;
    const restored = await runtime.restoreAfterReconnect();
    expect(restored.sort()).toEqual(["R_100", "frxEURUSD"]);
    expect(fixture.subscribes().length).toBe(before + 2);
    // No duplicate external subscriptions on a second restore pass.
    const again = await runtime.restoreAfterReconnect();
    expect(again).toEqual([]);
    expect(fixture.subscribes().length).toBe(before + 2);
    // Recovery to FRESH only after valid new ticks.
    fixture.emitTick("frxEURUSD", 1_700_000_200, 1.0852);
    expect(runtime.hub.freshness("frxEURUSD", true)).toBe("FRESH");
    await runtime.stop();
  });

  it("captures ticks and proposals into rolling Parquet partitions", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const root = mkdtempSync(join(tmpdir(), "dt-cap-"));
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: root,
    });
    await runtime.connect();
    await runtime.probeExpiries(["frxEURUSD"]);
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    clock.advance(2000);
    const result = await runtime.captureCycle();
    expect(result.finalized).toBeGreaterThan(0);
    const data = runtime.statusData();
    expect(data.partitionsFinalized).toBeGreaterThan(0);
    expect(data.session.tickRows).toBeGreaterThan(0);
    expect(data.session.proposalRows).toBeGreaterThan(0);
    expect(data.dqgFindings).toBe(0);
    expect(data.capture).toBe("live");
    await runtime.stop();
  });

  it("rolls on CAPTURE_ROLL_MS with fake-clock control", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-roll-")),
    });
    await runtime.connect();
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    // Within the roll window: buffered, nothing finalized.
    const early = await runtime.captureCycle();
    expect(early.finalized).toBe(0);
    clock.advance(2000);
    const rolled = await runtime.captureCycle();
    expect(rolled.finalized).toBeGreaterThan(0);
    await runtime.stop();
  });

  it("degrades optional capture at the disk stop threshold", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig({ DATA_DISK_STOP_MB: "999999999", DATA_DISK_WARN_MB: "999999999" }),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-disk-")),
    });
    await runtime.connect();
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    clock.advance(2000);
    await runtime.captureCycle();
    const data = runtime.statusData();
    expect(data.diskStopped).toBe(true);
    expect(data.capture).toBe("idle");
    expect(data.diskMb).not.toBeNull();
    await runtime.stop();
  });

  it("stays fail-closed on stale or missing proposal economics", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    fixture.setQuoter((a) => quoteFor(a, null));
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-fc-")),
    });
    await runtime.connect();
    // Manually prove an expiry so the lattice has candidates with no economics.
    runtime.registry.proveExpiry("frxEURUSD", 60, "CALL");
    runtime.registry.proveExpiry("frxEURUSD", 60, "PUT");
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    const lattice = runtime.lattice();
    expect(lattice.count).toBeGreaterThan(0);
    expect(lattice.eligible).toBe(0);
    expect(lattice.opportunities.every((o) => o.eligibility === "PROPOSAL_STALE")).toBe(true);
    await runtime.stop();
  });

  it("partitions capture by symbol and symbol+expiry with prunable readback (R6)", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD", "R_100"]);
    const root = mkdtempSync(join(tmpdir(), "dt-part-"));
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: root,
    });
    fixture.setQuoter((a) => quoteFor(a, a.durationSeconds === 60 || a.durationSeconds === 180 ? 0.9 : null));
    await runtime.connect();
    await runtime.probeExpiries();
    await runtime.ensureTicks();
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    fixture.emitTick("R_100", 1_700_000_100, 501);
    clock.advance(2000);
    const result = await runtime.captureCycle();
    expect(result.finalized).toBeGreaterThan(0);
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith(".parquet")) files.push(full);
      }
    };
    walk(root);
    // Symbol-partitioned ticks and symbol+expiry proposals, passport lists all.
    expect(files.some((f) => f.includes("symbol=frxEURUSD"))).toBe(true);
    expect(files.some((f) => f.includes("symbol=R_100"))).toBe(true);
    expect(files.some((f) => f.includes("expiry_s=60"))).toBe(true);
    expect(files.some((f) => f.includes("expiry_s=180"))).toBe(true);
    expect(files.every((f) => f.includes("symbol="))).toBe(true);
    const { openMemory, readParquetCount } = await import("@deriv-trader/research");
    const { connection } = await openMemory();
    try {
      const eurTicks = files.filter((f) => f.includes(join("ticks")) && f.includes("symbol=frxEURUSD"));
      expect(eurTicks).toHaveLength(1);
      expect(await readParquetCount(connection, eurTicks[0] ?? "")).toBe(1);
      const eur60 = files.filter((f) => f.includes("symbol=frxEURUSD") && f.includes("expiry_s=60"));
      expect(eur60).toHaveLength(1);
      expect(await readParquetCount(connection, eur60[0] ?? "")).toBeGreaterThan(0);
    } finally {
      connection.closeSync();
    }
    await runtime.stop();
  });

  it("reports stopped and disconnected lifecycles as idle capture (R4)", async () => {
    const clock = makeClock();
    const fixture = fixtureTransport(["frxEURUSD"]);
    const runtime = new MarketScannerRuntime({
      config: testConfig(),
      source: fixture.source,
      clock,
      captureRoot: mkdtempSync(join(tmpdir(), "dt-life-")),
    });
    expect(runtime.loopState().lifecycle).toBe("idle");
    expect(runtime.statusData().capture).toBe("idle");
    await runtime.connect();
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    expect(runtime.statusData().capture).toBe("live");
    await runtime.stop();
    expect(runtime.loopState().lifecycle).toBe("stopped");
    expect(runtime.statusData().capture).toBe("idle");
  });
});

describe("continuous read-only lifecycle (R7)", () => {
  it("runs bounded cycles on timers without overlap and pauses cleanly", async () => {
    const { vi } = await import("vitest");
    vi.useFakeTimers();
    try {
      const clock = makeClock();
      const fixture = fixtureTransport(["frxEURUSD"]);
      const runtime = new MarketScannerRuntime({
        config: testConfig(),
        source: fixture.source,
        clock,
        captureRoot: mkdtempSync(join(tmpdir(), "dt-loop-")),
      });
      // Constructing starts nothing: no timers, no sends.
      expect(runtime.loopState()).toMatchObject({ lifecycle: "idle", timers: 0 });
      expect(fixture.sends()).toBe(0);
      await runtime.connect();
      runtime.startReadOnlyScanner({ universeMs: 1000, pulseMs: 1000, captureMs: 1000 });
      expect(runtime.loopState().timers).toBe(3);
      // Periodic repetition: poll to the condition with a hard cap instead of
      // asserting exact cadence (cycle latency varies; skips are by design).
      for (let i = 0; i < 20; i += 1) {
        const current = runtime.loopState().counters;
        if (current.universe >= 2 && current.pulse >= 2 && current.capture >= 2) break;
        await vi.advanceTimersByTimeAsync(500);
      }
      const counters = runtime.loopState().counters;
      expect(counters.universe).toBeGreaterThanOrEqual(2);
      expect(counters.pulse).toBeGreaterThanOrEqual(2);
      expect(counters.capture).toBeGreaterThanOrEqual(2);
      expect(runtime.loopState().maxConcurrentCycles).toBeLessThanOrEqual(1);
      runtime.pauseReadOnlyScanner();
      expect(runtime.loopState()).toMatchObject({ timers: 0 });
      expect(runtime.loopState().lifecycle).toBe("paused");
      expect(runtime.statusData().capture).toBe("idle");
      const frozen = { ...runtime.loopState().counters };
      await vi.advanceTimersByTimeAsync(5000);
      expect(runtime.loopState().counters).toEqual(frozen);
      await runtime.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
