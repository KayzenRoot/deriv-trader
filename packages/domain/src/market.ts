/**
 * Read-only public-market vocabulary and port interfaces (DT-WP-02).
 * Broker-agnostic normalized types plus the seams (ports) that the Deriv
 * adapter implements and the market-data/scanner packages consume.
 * No network code and no economic actions live here.
 */
import type { ExpirySeconds } from "./index.js";

/** Normalized active instrument from active_symbols (current field names). */
export interface ActiveInstrument {
  readonly underlyingSymbol: string;
  readonly name: string;
  readonly type: string;
  readonly market: string;
  readonly submarket: string;
  readonly pipSize: number;
  readonly exchangeOpen: boolean;
  readonly tradingSuspended: boolean;
  readonly tradeCount: number | null;
}

/** Normalized contract capability from contracts_for (simplified response). */
export interface ContractCapability {
  readonly underlyingSymbol: string;
  readonly contractCategory: string;
  readonly contractType: string;
  readonly expiryType: string;
  readonly sentiment: string | null;
  readonly barriers: number;
  readonly market: string;
  readonly submarket: string;
}

/** Normalized market tick: underlying symbol, event/receive times, quote. */
export interface MarketTick {
  readonly underlyingSymbol: string;
  readonly eventTime: number;
  readonly receiveTime: string;
  readonly quote: number;
  readonly pipSize: number | null;
  readonly sourceConnectionId: string;
  readonly reqId: number | null;
  readonly subscriptionId: string | null;
  readonly sequence: number;
  readonly stale: boolean;
  readonly gap: boolean;
  readonly outOfOrder: boolean;
  readonly duplicate: boolean;
}

export type ContractDirection = "CALL" | "PUT";

/** Explicit, reproducible proposal probe assumptions (NOT the user stake). */
export interface ProposalAssumptions {
  readonly contractType: ContractDirection;
  readonly underlyingSymbol: string;
  readonly durationSeconds: ExpirySeconds;
  readonly amount: number;
  readonly basis: string;
  readonly currency: string;
}

export type ProposalState = "KNOWN" | "UNKNOWN";

/** Normalized proposal economics; UNKNOWN fails closed downstream. */
export interface ProposalQuote {
  readonly key: string;
  readonly assumptions: ProposalAssumptions;
  readonly proposalId: string | null;
  readonly askPrice: number | null;
  readonly payout: number | null;
  readonly effectivePayout: number | null;
  readonly breakEven: number | null;
  readonly state: ProposalState;
  readonly requestedAt: string;
  readonly receivedAt: string;
  readonly source: string;
}

/** Default eligibility threshold: effective payout >= 0.80. */
export const EFFECTIVE_PAYOUT_THRESHOLD = 0.8;

/** effective_payout = (payout - ask_price) / ask_price, or null when unsafe. */
export function effectivePayout(askPrice: number | null, payout: number | null): number | null {
  if (askPrice === null || payout === null) return null;
  if (!Number.isFinite(askPrice) || !Number.isFinite(payout)) return null;
  if (askPrice <= 0 || payout <= 0) return null;
  return (payout - askPrice) / askPrice;
}

/** break_even = ask_price / payout, or null when unsafe. */
export function breakEven(askPrice: number | null, payout: number | null): number | null {
  if (askPrice === null || payout === null) return null;
  if (!Number.isFinite(askPrice) || !Number.isFinite(payout)) return null;
  if (askPrice <= 0 || payout <= 0) return null;
  return askPrice / payout;
}

/** Cache key distinguishes symbol + direction + expiry + probe assumptions. */
export function proposalKey(assumptions: ProposalAssumptions): string {
  return [
    assumptions.underlyingSymbol,
    assumptions.contractType,
    String(assumptions.durationSeconds),
    assumptions.currency,
    assumptions.basis,
    String(assumptions.amount),
  ].join("|");
}

/** Connection lifecycle states for the public channel supervisor. */
export type ConnectionState =
  | "DISCONNECTED"
  | "BACKOFF"
  | "CONNECTING"
  | "SYNCING"
  | "HEALTHY"
  | "DEGRADED"
  | "STOPPED";

export interface ConnectionHealth {
  readonly state: ConnectionState;
  readonly reconnectCount: number;
  readonly lastErrorCategory: string | null;
  readonly lastTransitionAt: string;
}

/**
 * Read-only public market source port. Implemented once by the Deriv adapter
 * against the live public WebSocket (or fakes in tests); consumed by the
 * market-data registry, tick hub, history bootstrap and the scanner's payout
 * pulse. No authenticated/economic operations exist on this port.
 */
export interface MarketDataSource {
  getActiveSymbols(): Promise<ActiveInstrument[]>;
  getContractsFor(underlyingSymbol: string): Promise<ContractCapability[]>;
  subscribeTicks(
    underlyingSymbol: string,
    handler: (tick: MarketTick) => void,
  ): Promise<{ subscriptionId: string; unsubscribe: () => Promise<void> }>;
  getTicksHistory(
    underlyingSymbol: string,
    start: number,
    end: number | "latest",
    count: number,
  ): Promise<MarketTick[]>;
  requestProposal(assumptions: ProposalAssumptions): Promise<ProposalQuote>;
  forget(subscriptionId: string): Promise<boolean>;
  forgetAll(): Promise<void>;
}

/** Injectable clock so reconnect/budget behavior is deterministic in tests. */
export interface Clock {
  nowMs(): number;
}

export function systemClock(): Clock {
  return { nowMs: () => Date.now() };
}
