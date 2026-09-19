import { describe, expect, it } from "vitest";
import type {
  ActiveInstrument,
  ContractCapability,
  MarketDataSource,
  MarketTick,
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import { SymbolRegistry } from "./registry.js";
import { SharedTickHub, classifyFreshness } from "./ticks.js";

function instrument(symbol: string, overrides: Partial<ActiveInstrument> = {}): ActiveInstrument {
  return {
    underlyingSymbol: symbol,
    name: symbol,
    type: "forex",
    market: "forex",
    submarket: "major_pairs",
    pipSize: 0.0001,
    exchangeOpen: true,
    tradingSuspended: false,
    tradeCount: 1,
    ...overrides,
  };
}

function capability(symbol: string): ContractCapability {
  return {
    underlyingSymbol: symbol,
    contractCategory: "callput",
    contractType: "CALL",
    expiryType: "intraday",
    sentiment: "up",
    barriers: 0,
    market: "forex",
    submarket: "major_pairs",
  };
}

function makeClock(start = 0): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return { nowMs: () => now, advance: (ms: number) => { now += ms; } };
}

function makeSource(symbols: ActiveInstrument[]): MarketDataSource & { calls: string[] } {
  const calls: string[] = [];
  const source: MarketDataSource & { calls: string[] } = {
    calls,
    getActiveSymbols: () => {
      calls.push("active_symbols");
      return Promise.resolve(symbols);
    },
    getContractsFor: (symbol: string) => {
      calls.push(`contracts_for:${symbol}`);
      return Promise.resolve([capability(symbol)]);
    },
    subscribeTicks: () => Promise.resolve({ subscriptionId: "s", unsubscribe: () => Promise.resolve() }),
    getTicksHistory: () => Promise.resolve([]),
    requestProposal: (assumptions: ProposalAssumptions): Promise<ProposalQuote> =>
      Promise.resolve({
        key: "k",
        assumptions,
        proposalId: null,
        askPrice: null,
        payout: null,
        effectivePayout: null,
        breakEven: null,
        state: "UNKNOWN",
        requestedAt: "",
        receivedAt: "",
        source: "fake",
      }),
    forget: () => Promise.resolve(true),
    forgetAll: () => Promise.resolve(),
  };
  return source;
}

function tick(symbol: string, eventTime: number, quote: number): MarketTick {
  return {
    underlyingSymbol: symbol,
    eventTime,
    receiveTime: new Date(eventTime * 1000).toISOString(),
    quote,
    pipSize: null,
    sourceConnectionId: "c1",
    reqId: null,
    subscriptionId: null,
    sequence: 0,
    stale: false,
    gap: false,
    outOfOrder: false,
    duplicate: false,
  };
}

describe("symbol registry", () => {
  it("builds the universe dynamically with no hard-coded catalog", async () => {
    const source = makeSource([instrument("frxEURUSD"), instrument("R_100")]);
    const registry = new SymbolRegistry(source);
    const records = await registry.refreshSymbols();
    expect(records.map((r) => r.instrument.underlyingSymbol).sort()).toEqual([
      "R_100",
      "frxEURUSD",
    ]);
    // No CALL/PUT capability or proven expiry yet → unsupported until proven.
    expect(records.every((r) => r.state === "ACTIVE_UNSUPPORTED")).toBe(true);
    await registry.refreshCapabilities("frxEURUSD");
    registry.proveExpiry("frxEURUSD", 60, "CALL");
    expect(registry.get("frxEURUSD")?.state).toBe("ACTIVE_ELIGIBLE");
    expect(registry.isProven("frxEURUSD", "CALL", 60)).toBe(true);
    expect(registry.isProven("frxEURUSD", "PUT", 60)).toBe(false);
    expect(source.calls).toContain("contracts_for:frxEURUSD");
  });

  it("marks suspended/closed markets and narrows via allow/block lists", async () => {
    const source = makeSource([
      instrument("frxEURUSD"),
      instrument("R_100", { tradingSuspended: true }),
    ]);
    const registry = new SymbolRegistry(source);
    await registry.refreshSymbols();
    await registry.refreshCapabilities("frxEURUSD");
    await registry.refreshCapabilities("R_100");
    registry.proveExpiry("frxEURUSD", 60, "CALL");
    registry.proveExpiry("R_100", 60, "PUT");
    expect(registry.get("R_100")?.state).toBe("CLOSED");
    registry.setFilter({ allow: null, block: ["frxEURUSD"] });
    expect(registry.get("frxEURUSD")?.state).toBe("INACTIVE");
    // Block lists narrow only: unblocking restores eligibility.
    registry.setFilter({ allow: null, block: [] });
    expect(registry.get("frxEURUSD")?.state).toBe("ACTIVE_ELIGIBLE");
  });
});

describe("shared tick hub", () => {
  it("keeps one external subscription for many internal consumers", async () => {
    let external = 0;
    const clock = makeClock(1_000_000);
    const source = makeSource([]);
    const hubSource: MarketDataSource = {
      ...source,
      subscribeTicks: () => {
        external += 1;
        return Promise.resolve({ subscriptionId: "s", unsubscribe: () => Promise.resolve() });
      },
    };
    const hub = new SharedTickHub(hubSource, clock);
    const receivedA: MarketTick[] = [];
    const receivedB: MarketTick[] = [];
    const releaseA = await hub.subscribe("frxEURUSD", (t) => receivedA.push(t));
    const releaseB = await hub.subscribe("frxEURUSD", (t) => receivedB.push(t));
    expect(external).toBe(1);
    expect(hub.externalCount()).toBe(1);
    hub.ingest(tick("frxEURUSD", 100, 1.1));
    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
    await releaseA();
    await releaseB();
    expect(hub.externalCount()).toBe(0);
  });

  it("detects duplicates, out-of-order and gaps", async () => {
    const clock = makeClock(1_000_000);
    const hub = new SharedTickHub(makeSource([]), clock);
    const seen: MarketTick[] = [];
    await hub.subscribe("R_100", (t) => seen.push(t));
    hub.ingest(tick("R_100", 100, 500));
    hub.ingest(tick("R_100", 100, 500));
    hub.ingest(tick("R_100", 99, 499));
    hub.ingest(tick("R_100", 200, 501));
    expect(seen[1]?.duplicate).toBe(true);
    expect(seen[2]?.outOfOrder).toBe(true);
    expect(seen[3]?.gap).toBe(true);
    expect(hub.freshness("R_100", true)).toBe("GAPPED");
  });

  it("invalidates on reconnect and classifies freshness transitions", () => {
    expect(
      classifyFreshness({ tickAgeMs: 1000, gapDetected: false, connectionHealthy: true, trusted: true }),
    ).toBe("FRESH");
    expect(
      classifyFreshness({ tickAgeMs: 10_000, gapDetected: false, connectionHealthy: true, trusted: true }),
    ).toBe("AGING");
    expect(
      classifyFreshness({ tickAgeMs: 60_000, gapDetected: false, connectionHealthy: true, trusted: true }),
    ).toBe("STALE");
    expect(
      classifyFreshness({ tickAgeMs: 1, gapDetected: false, connectionHealthy: false, trusted: true }),
    ).toBe("STALE");
    expect(
      classifyFreshness({ tickAgeMs: 1, gapDetected: false, connectionHealthy: true, trusted: false }),
    ).toBe("UNTRUSTED");
  });
});
