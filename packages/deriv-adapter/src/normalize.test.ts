import { describe, expect, it } from "vitest";
import {
  normalizeActiveSymbol,
  normalizeContractItem,
  normalizeHistory,
  normalizeProposal,
  normalizeTick,
  coerceNumber,
} from "./normalize.js";
import type { ProposalAssumptions } from "@deriv-trader/domain";

const ASSUMPTIONS: ProposalAssumptions = {
  contractType: "CALL",
  underlyingSymbol: "frxEURUSD",
  durationSeconds: 60,
  amount: 10,
  basis: "stake",
  currency: "USD",
};

const CTX = {
  requestedAt: "2026-09-18T00:00:00.000Z",
  receivedAt: "2026-09-18T00:00:01.000Z",
  source: "test",
};

describe("current-schema normalization", () => {
  it("parses current active_symbols fields and tolerates unknown optionals", () => {
    const instrument = normalizeActiveSymbol({
      underlying_symbol: "frxEURUSD",
      underlying_symbol_name: "EUR/USD",
      underlying_symbol_type: "forex",
      market: "forex",
      submarket: "major_pairs",
      subgroup: "major_pairs",
      exchange_is_open: 1,
      is_trading_suspended: 0,
      pip_size: 0.0001,
      trade_count: 7,
      future_field: "tolerated",
    });
    expect(instrument?.underlyingSymbol).toBe("frxEURUSD");
    expect(instrument?.pipSize).toBe(0.0001);
    expect(instrument?.exchangeOpen).toBe(true);
    expect(instrument?.tradeCount).toBe(7);
  });

  it("fails closed when critical identity is missing (legacy shape)", () => {
    expect(normalizeActiveSymbol({ symbol: "frxEURUSD", display_name: "EUR/USD" })).toBeNull();
    expect(normalizeActiveSymbol(null)).toBeNull();
  });

  it("parses simplified contracts_for and rejects items without identity", () => {
    const capability = normalizeContractItem("frxEURUSD", {
      contract_category: "callput",
      contract_type: "CALL",
      expiry_type: "intraday",
      sentiment: "up",
      barriers: 0,
      market: "forex",
      submarket: "major_pairs",
      underlying_symbol: "frxEURUSD",
      removed_field: "tolerated",
    });
    expect(capability?.contractType).toBe("CALL");
    expect(normalizeContractItem("frxEURUSD", { market: "forex" })).toBeNull();
  });

  it("normalizes ticks with number|string quote/epoch and rejects bad quotes", () => {
    const tick = normalizeTick(
      { symbol: "frxEURUSD", quote: "1.0851", epoch: "1234567891" },
      {
        receiveTime: CTX.receivedAt,
        sourceConnectionId: "c1",
        sequence: 1,
        reqId: null,
        subscriptionId: "s1",
      },
    );
    expect(tick?.quote).toBe(1.0851);
    expect(tick?.eventTime).toBe(1234567891);
    expect(
      normalizeTick(
        { symbol: "frxEURUSD", quote: "nan", epoch: 1 },
        {
          receiveTime: CTX.receivedAt,
          sourceConnectionId: "c1",
          sequence: 1,
          reqId: null,
          subscriptionId: null,
        },
      ),
    ).toBeNull();
  });

  it("normalizes history arrays into ticks", () => {
    const ticks = normalizeHistory(
      "frxEURUSD",
      { history: { prices: [1.1, 1.2], times: [100, 101] } },
      {
        receiveTime: CTX.receivedAt,
        sourceConnectionId: "c1",
        reqId: null,
        subscriptionId: null,
      },
    );
    expect(ticks).toHaveLength(2);
    expect(ticks[0]?.quote).toBe(1.1);
    expect(normalizeHistory("frxEURUSD", { history: null }, {
      receiveTime: CTX.receivedAt,
      sourceConnectionId: "c1",
      reqId: null,
      subscriptionId: null,
    })).toEqual([]);
  });

  it("normalizes string economics and fails closed on missing ask/payout", () => {
    const known = normalizeProposal(
      ASSUMPTIONS,
      { id: "p1", ask_price: "10.50", payout: "20.00" },
      CTX,
    );
    expect(known.state).toBe("KNOWN");
    expect(known.effectivePayout).toBeCloseTo((20 - 10.5) / 10.5, 10);
    expect(known.breakEven).toBeCloseTo(10.5 / 20, 10);
    const unknown = normalizeProposal(ASSUMPTIONS, { id: "p2" }, CTX);
    expect(unknown.state).toBe("UNKNOWN");
    expect(unknown.effectivePayout).toBeNull();
    const noId = normalizeProposal(ASSUMPTIONS, { ask_price: 1, payout: 2 }, CTX);
    expect(noId.state).toBe("UNKNOWN");
  });

  it("coerces number|string safely", () => {
    expect(coerceNumber(" 12.5 ")).toBe(12.5);
    expect(coerceNumber("")).toBeNull();
    expect(coerceNumber(Number.NaN)).toBeNull();
    expect(coerceNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(coerceNumber(null)).toBeNull();
  });
});
