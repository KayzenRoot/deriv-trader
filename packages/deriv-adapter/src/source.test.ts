import { describe, expect, it } from "vitest";
import { ApiBudgetManager } from "./budget.js";
import { BrokerRequestError } from "./errors.js";
import { DerivPublicMarketSource } from "./source.js";
import { PublicWsClient } from "./transport.js";
import type {
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import { proposalKey } from "@deriv-trader/domain";

function makeClock(start = 1_700_000_000_000): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return { nowMs: () => now, advance: (ms: number) => { now += ms; } };
}

/** Scripted in-memory socket: reply queues per request kind. */
function scriptedSource(replies: {
  readonly activeSymbols?: unknown;
  readonly contractsFor?: unknown;
  readonly proposal?: (payload: Record<string, unknown>) => unknown;
}): { source: DerivPublicMarketSource; budget: ApiBudgetManager; sends: () => number } {
  const clock = makeClock();
  const budget = new ApiBudgetManager({}, clock);
  let sends = 0;
  const client = new PublicWsClient("wss://fixture.test", {
    clock,
    socketFactory: () => {
      throw new Error("fixture source never opens sockets");
    },
  });
  // Bypass transport: stub request at the client boundary with reply scripts.
  client.request = (payload: Record<string, unknown>): Promise<unknown> => {
    sends += 1;
    if ("active_symbols" in payload) return Promise.resolve(replies.activeSymbols ?? { active_symbols: [] });
    if ("contracts_for" in payload) {
      return Promise.resolve(replies.contractsFor ?? { contracts_for: { available: [] } });
    }
    if ("proposal" in payload) return Promise.resolve(replies.proposal?.(payload) ?? { proposal: null });
    return Promise.resolve({});
  };
  const source = new DerivPublicMarketSource(client, budget, { clock, buildSha: "test" });
  return { source, budget, sends: () => sends };
}

const SYMBOLS = {
  active_symbols: [
    {
      underlying_symbol: "frxEURUSD",
      underlying_symbol_name: "EUR/USD",
      underlying_symbol_type: "forex",
      market: "forex",
      submarket: "major_pairs",
      exchange_is_open: 1,
      is_trading_suspended: 0,
      pip_size: 0.0001,
      trade_count: 3,
    },
  ],
};

const CONTRACTS = {
  contracts_for: {
    available: [
      {
        contract_category: "callput",
        contract_type: "CALL",
        expiry_type: "intraday",
        market: "forex",
        submarket: "major_pairs",
        underlying_symbol: "frxEURUSD",
      },
    ],
    hit_count: 1,
  },
};

function knownProposal(payload: Record<string, unknown>): unknown {
  const duration: unknown = payload["duration"];
  const label = typeof duration === "string" || typeof duration === "number" ? String(duration) : "?";
  return {
    proposal: {
      id: `p-${label}`,
      ask_price: 10,
      payout: 19,
    },
  };
}

describe("market source request path", () => {
  it("charges exactly one budget unit per broker proposal send", async () => {
    const { source, budget, sends } = scriptedSource({ activeSymbols: SYMBOLS, contractsFor: CONTRACTS, proposal: knownProposal });
    const assumptions: ProposalAssumptions = {
      contractType: "CALL",
      underlyingSymbol: "frxEURUSD",
      durationSeconds: 60,
      amount: 10,
      basis: "stake",
      currency: "USD",
    };
    const quotes: ProposalQuote[] = [];
    for (let i = 0; i < 3; i += 1) quotes.push(await source.requestProposal(assumptions));
    expect(sends()).toBe(3);
    expect(budget.telemetry("proposal").callsLastMinute).toBe(3);
    expect(quotes.every((q) => q.state === "KNOWN")).toBe(true);
    expect(quotes[0]?.key).toBe(proposalKey(assumptions));
  });

  it("maps rate-limit envelopes to backoff without leaking payloads", async () => {
    const { source, budget } = scriptedSource({
      proposal: () => ({ error: { code: "RateLimit", message: "quota exceeded, slow down" } }),
    });
    const assumptions: ProposalAssumptions = {
      contractType: "CALL",
      underlyingSymbol: "frxEURUSD",
      durationSeconds: 60,
      amount: 10,
      basis: "stake",
      currency: "USD",
    };
    const failure = await source.requestProposal(assumptions).then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(BrokerRequestError);
    expect((failure as BrokerRequestError).category).toBe("RATE_LIMITED");
    expect(JSON.stringify(failure)).not.toContain("slow down");
    // Correct group backs off; other traffic is unaffected (no retry storm).
    expect(budget.telemetry("proposal").backoffUntilMs).not.toBeNull();
    expect(budget.telemetry("other").backoffUntilMs).toBeNull();
    expect(budget.admit("SIGNAL_PROPOSAL").admitted).toBe(false);
    expect(budget.admit("MARKET_DISCOVERY").admitted).toBe(true);
  });

  it("keeps schema mismatch distinct from broker errors", async () => {
    const { source } = scriptedSource({ activeSymbols: { nonsense: true } });
    const failure = await source.getActiveSymbols().then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(BrokerRequestError);
    expect((failure as BrokerRequestError).category).toBe("SCHEMA_MISMATCH");
    const validation = await scriptedSource({
      proposal: () => ({ error: { code: "InputValidationFailed", message: "bad amount" } }),
    }).source.requestProposal({
      contractType: "CALL",
      underlyingSymbol: "frxEURUSD",
      durationSeconds: 60,
      amount: 10,
      basis: "stake",
      currency: "USD",
    }).then(
      () => null,
      (error: unknown) => error,
    );
    expect((validation as BrokerRequestError).category).toBe("VALIDATION_ERROR");
  });

  it("discovers symbols and capabilities through guarded parsing", async () => {
    const { source } = scriptedSource({ activeSymbols: SYMBOLS, contractsFor: CONTRACTS });
    const symbols = await source.getActiveSymbols();
    expect(symbols.map((s) => s.underlyingSymbol)).toEqual(["frxEURUSD"]);
    const caps = await source.getContractsFor("frxEURUSD");
    expect(caps.map((c) => c.contractType)).toEqual(["CALL"]);
  });
});
