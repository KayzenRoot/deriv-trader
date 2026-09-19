import { describe, expect, it } from "vitest";
import type { ProposalAssumptions, ProposalQuote } from "@deriv-trader/domain";
import { summarizeFreshness, type SnapshotInput } from "@deriv-trader/market-data";
import { PayoutPulseScheduler, type PulseCandidate, type PulseBudget } from "./pulse.js";
import { evaluateEligibility, buildOpportunity, eligibilityFromSnapshot } from "./eligibility.js";
import type { EligibilityInput } from "./eligibility.js";

function assumptions(symbol = "frxEURUSD"): ProposalAssumptions {
  return {
    contractType: "CALL",
    underlyingSymbol: symbol,
    durationSeconds: 60,
    amount: 10,
    basis: "stake",
    currency: "USD",
  };
}

function quote(effective: number | null): ProposalQuote {
  return {
    key: "k",
    assumptions: assumptions(),
    proposalId: effective === null ? null : "p1",
    askPrice: 10,
    payout: effective === null ? null : 10 * (1 + effective),
    effectivePayout: effective,
    breakEven: null,
    state: effective === null ? "UNKNOWN" : "KNOWN",
    requestedAt: "",
    receivedAt: "",
    source: "test",
  };
}

function eligibleInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    underlyingSymbol: "frxEURUSD",
    expirySeconds: 60,
    marketActive: true,
    contractAvailable: true,
    expirySupported: true,
    tickFreshness: "FRESH",
    quote: quote(0.9),
    quoteAgeMs: 1000,
    userBlocked: false,
    apiHealthy: true,
    ...overrides,
  };
}

function makeClock(start = 0): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return { nowMs: () => now, advance: (ms: number) => { now += ms; } };
}

describe("eligibility engine", () => {
  it("transitions correctly across the 80% payout threshold", () => {
    expect(evaluateEligibility(eligibleInput()).state).toBe("ELIGIBLE");
    expect(evaluateEligibility(eligibleInput({ quote: quote(0.799) })).state).toBe("PAYOUT_TOO_LOW");
    expect(evaluateEligibility(eligibleInput({ quote: quote(0.8) })).state).toBe("ELIGIBLE");
  });

  it("keeps unsupported expiries and contracts ineligible", () => {
    expect(evaluateEligibility(eligibleInput({ expirySupported: false })).state).toBe(
      "UNSUPPORTED_EXPIRY",
    );
    expect(evaluateEligibility(eligibleInput({ contractAvailable: false })).state).toBe(
      "UNSUPPORTED_CONTRACT",
    );
    expect(evaluateEligibility(eligibleInput({ marketActive: false })).state).toBe("MARKET_INACTIVE");
  });

  it("fails closed on stale ticks, stale proposals and user blocks", () => {
    expect(evaluateEligibility(eligibleInput({ tickFreshness: "STALE" })).state).toBe("TICK_STALE");
    expect(evaluateEligibility(eligibleInput({ tickFreshness: "GAPPED" })).state).toBe("TICK_STALE");
    expect(evaluateEligibility(eligibleInput({ quote: quote(null) })).state).toBe("PROPOSAL_STALE");
    expect(evaluateEligibility(eligibleInput({ quoteAgeMs: 120_000 })).state).toBe("PROPOSAL_STALE");
    expect(evaluateEligibility(eligibleInput({ userBlocked: true })).state).toBe("USER_BLOCKED");
    expect(evaluateEligibility(eligibleInput({ apiHealthy: false })).state).toBe("API_DEGRADED");
  });

  it("builds direction-identified opportunities with blocker reasons", () => {
    const opportunity = buildOpportunity({
      ...eligibleInput({ quote: quote(0.5) }),
      direction: "CALL",
    });
    expect(opportunity.eligibility).toBe("PAYOUT_TOO_LOW");
    expect(opportunity.blockerReason).toContain("below");
    expect(opportunity.direction).toBe("CALL");
    expect(opportunity.proposalKey).toBe("k");
    expect(opportunity.proposalId).toBe("p1");
  });
});

function freshSnapshot(overrides: Partial<SnapshotInput> = {}) {
  return summarizeFreshness({
    underlyingSymbol: "frxEURUSD",
    direction: "CALL",
    expirySeconds: 60,
    registryAgeMs: 1000,
    registryState: "ACTIVE_ELIGIBLE",
    capabilityAgeMs: 1000,
    capabilityState: "OK",
    tickAgeMs: 1000,
    tickState: "FRESH",
    invalidated: false,
    gapped: false,
    proposalAgeMs: 1000,
    proposalKnown: true,
    connectionEpoch: 0,
    connectionHealthy: true,
    skewSeconds: 1,
    trusted: true,
    ...overrides,
  });
}

const SNAP_GATES = {
  marketActive: true,
  contractAvailable: true,
  expirySupported: true,
  userBlocked: false,
  apiHealthy: true,
} as const;

describe("snapshot-driven eligibility (R3)", () => {
  it("stays eligible when every authority is fresh", () => {
    const result = eligibilityFromSnapshot(freshSnapshot(), quote(0.9), 1000, { ...SNAP_GATES });
    expect(result.state).toBe("ELIGIBLE");
  });

  it("fails closed on stale capability authority", () => {
    const snapshot = freshSnapshot({ capabilityAgeMs: 20 * 60_000 });
    expect(snapshot.capabilityStale).toBe(true);
    const result = eligibilityFromSnapshot(snapshot, quote(0.9), 1000, { ...SNAP_GATES });
    expect(result.state).toBe("UNKNOWN_FAIL_CLOSED");
  });

  it("fails closed on stale registry authority", () => {
    const snapshot = freshSnapshot({ registryAgeMs: 60 * 60_000 });
    expect(snapshot.registryStale).toBe(true);
    const result = eligibilityFromSnapshot(snapshot, quote(0.9), 1000, { ...SNAP_GATES });
    expect(result.state).toBe("UNKNOWN_FAIL_CLOSED");
  });

  it("fails closed on suspect clock skew despite fresh ticks", () => {
    const snapshot = freshSnapshot({ skewSeconds: 300 });
    expect(snapshot.skewSuspect).toBe(true);
    const result = eligibilityFromSnapshot(snapshot, quote(0.9), 1000, { ...SNAP_GATES });
    expect(result.state).toBe("UNKNOWN_FAIL_CLOSED");
  });

  it("fails closed on stale proposals via the snapshot TTL", () => {
    const snapshot = freshSnapshot({ proposalAgeMs: 120_000, proposalKnown: false });
    const result = eligibilityFromSnapshot(snapshot, quote(null), 120_000, { ...SNAP_GATES });
    expect(result.state).toBe("PROPOSAL_STALE");
  });
});

describe("payout pulse scheduler", () => {
  it("prioritizes signal demand and never schedules the reserve", async () => {
    const clock = makeClock(0);
    const budget: PulseBudget = { peek: () => true };
    const quoted: string[] = [];
    const scheduler = new PayoutPulseScheduler(
      budget,
      (a) => {
        quoted.push(a.underlyingSymbol);
        return Promise.resolve(quote(0.9));
      },
      { clock },
    );
    const mk = (symbol: string, priority: 0 | 1 | 2 | 3 | 4): PulseCandidate => ({
      assumptions: assumptions(symbol),
      priority,
      signalDemand: priority === 1,
      lastQuoteAtMs: priority === 0 ? null : 0,
      lastEffective: null,
    });
    clock.advance(10 * 60_000);
    const results = await scheduler.refresh([
      mk("cold", 4),
      mk("reserve", 0),
      mk("signal", 1),
    ]);
    expect(quoted[0]).toBe("signal");
    expect(quoted).not.toContain("reserve");
    expect(results).toHaveLength(2);
  });

  it("stops at the budget instead of exhausting proposals", async () => {
    const clock = makeClock(0);
    let calls = 0;
    const budget: PulseBudget = {
      peek: () => calls < 1,
    };
    const scheduler = new PayoutPulseScheduler(
      budget,
      () => {
        calls += 1;
        return Promise.resolve(quote(0.9));
      },
      { clock },
    );
    const mk = (symbol: string): PulseCandidate => ({
      assumptions: assumptions(symbol),
      priority: 3,
      signalDemand: false,
      lastQuoteAtMs: null,
      lastEffective: null,
    });
    const results = await scheduler.refresh([mk("a"), mk("b"), mk("c")]);
    expect(results).toHaveLength(1);
  });
});
