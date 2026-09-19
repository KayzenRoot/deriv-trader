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
    expect(runtime.registry.get("frxEURUSD")?.supportedExpiries).toEqual([60]);
    await runtime.probeExpiries();
    await runtime.probeExpiries();
    const lattice = runtime.lattice();
    const expiries = new Set(lattice.opportunities.map((o) => o.expirySeconds));
    expect(expiries.has(60)).toBe(true);
    expect(expiries.has(180)).toBe(false);
    expect(expiries.has(300)).toBe(false);
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
    runtime.registry.proveExpiry("frxEURUSD", 60);
    await runtime.ensureTicks(["frxEURUSD"]);
    fixture.emitTick("frxEURUSD", 1_700_000_100, 1.0851);
    const lattice = runtime.lattice();
    expect(lattice.count).toBeGreaterThan(0);
    expect(lattice.eligible).toBe(0);
    expect(lattice.opportunities.every((o) => o.eligibility === "PROPOSAL_STALE")).toBe(true);
    await runtime.stop();
  });
});
