/**
 * Current-schema normalization: raw broker JSON → domain objects (DT-WP-02).
 * Pure functions. Anything unknown, malformed or economically unsafe returns
 * null / UNKNOWN — callers treat that as ineligible (fail closed).
 */
import type {
  ActiveInstrument,
  ContractCapability,
  MarketTick,
  ProposalAssumptions,
  ProposalQuote,
} from "@deriv-trader/domain";
import {
  breakEven,
  effectivePayout,
  proposalKey,
} from "@deriv-trader/domain";
import {
  activeSymbolSchema,
  contractItemSchema,
  historyResponseSchema,
  proposalPayloadSchema,
  tickPayloadSchema,
} from "./schemas.js";

export const SCHEMA_VERSION = "deriv-options-2026-09-18";

function toBool(value: boolean | number | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return fallback;
}

/** Coerce broker number|string fields; null when missing/invalid. */
export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeActiveSymbol(raw: unknown): ActiveInstrument | null {
  const parsed = activeSymbolSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  const pipSize = coerceNumber(item.pip_size ?? null);
  return {
    underlyingSymbol: item.underlying_symbol,
    name: item.underlying_symbol_name ?? item.underlying_symbol,
    type: item.underlying_symbol_type ?? "unknown",
    market: item.market ?? "unknown",
    submarket: item.submarket ?? item.subgroup ?? "unknown",
    pipSize: pipSize ?? 0,
    exchangeOpen: toBool(item.exchange_is_open, false),
    tradingSuspended: toBool(item.is_trading_suspended, false),
    tradeCount: typeof item.trade_count === "number" ? item.trade_count : null,
  };
}

export function normalizeContractItem(
  underlyingSymbol: string,
  raw: unknown,
): ContractCapability | null {
  const parsed = contractItemSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (!item.contract_type || !item.contract_category) return null;
  return {
    underlyingSymbol: item.underlying_symbol ?? underlyingSymbol,
    contractCategory: item.contract_category,
    contractType: item.contract_type,
    expiryType: item.expiry_type ?? "unknown",
    sentiment: item.sentiment ?? null,
    barriers: item.barriers ?? 0,
    market: item.market ?? "unknown",
    submarket: item.submarket ?? "unknown",
  };
}

export interface TickContext {
  readonly receiveTime: string;
  readonly sourceConnectionId: string;
  readonly sequence: number;
  readonly reqId: number | null;
  readonly subscriptionId: string | null;
}

export function normalizeTick(raw: unknown, ctx: TickContext): MarketTick | null {
  const parsed = tickPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;
  const tick = parsed.data;
  // Current API identifies ticks by underlying symbol naming; legacy `symbol`
  // values are preserved verbatim when present (no silent remapping).
  if (!tick.symbol) return null;
  const quote = coerceNumber(tick.quote ?? null);
  const eventTime = coerceNumber(tick.epoch ?? null);
  if (quote === null || eventTime === null) return null;
  return {
    underlyingSymbol: tick.symbol,
    eventTime: Math.floor(eventTime),
    receiveTime: ctx.receiveTime,
    quote,
    pipSize: null,
    sourceConnectionId: ctx.sourceConnectionId,
    reqId: ctx.reqId,
    subscriptionId: ctx.subscriptionId,
    sequence: ctx.sequence,
    stale: false,
    gap: false,
    outOfOrder: false,
    duplicate: false,
  };
}

export function normalizeHistory(
  underlyingSymbol: string,
  raw: unknown,
  ctx: Omit<TickContext, "sequence">,
): MarketTick[] {
  const parsed = historyResponseSchema.safeParse(raw);
  if (!parsed.success) return [];
  const history = parsed.data.history;
  if (!history) return [];
  const out: MarketTick[] = [];
  const len = Math.min(history.prices.length, history.times.length);
  for (let i = 0; i < len; i += 1) {
    const tick = normalizeTick(
      { symbol: underlyingSymbol, quote: history.prices[i], epoch: history.times[i] },
      { ...ctx, sequence: i },
    );
    if (tick) out.push(tick);
  }
  return out;
}

export function normalizeProposal(
  assumptions: ProposalAssumptions,
  raw: unknown,
  ctx: { requestedAt: string; receivedAt: string; source: string },
): ProposalQuote {
  const key = proposalKey(assumptions);
  const base = {
    key,
    assumptions,
    requestedAt: ctx.requestedAt,
    receivedAt: ctx.receivedAt,
    source: ctx.source,
  };
  const parsed = proposalPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ...base,
      proposalId: null,
      askPrice: null,
      payout: null,
      effectivePayout: null,
      breakEven: null,
      state: "UNKNOWN",
    };
  }
  const payload = parsed.data;
  if (!payload.id) {
    return {
      ...base,
      proposalId: null,
      askPrice: null,
      payout: null,
      effectivePayout: null,
      breakEven: null,
      state: "UNKNOWN",
    };
  }
  const askPrice = coerceNumber(payload.ask_price ?? null);
  const payout = coerceNumber(payload.payout ?? null);
  const effective = effectivePayout(askPrice, payout);
  const even = breakEven(askPrice, payout);
  if (effective === null || even === null) {
    return {
      ...base,
      proposalId: payload.id,
      askPrice,
      payout,
      effectivePayout: null,
      breakEven: null,
      state: "UNKNOWN",
    };
  }
  return {
    ...base,
    proposalId: payload.id,
    askPrice,
    payout,
    effectivePayout: effective,
    breakEven: even,
    state: "KNOWN",
  };
}
