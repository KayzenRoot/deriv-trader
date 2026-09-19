/**
 * Legacy WP-01 market-data shapes (kept for compatibility).
 * New code prefers the normalized domain vocabulary (MarketTick, etc.).
 */
export interface Tick {
  readonly symbol: string;
  readonly epoch: number;
  readonly quote: number;
  readonly receivedAt: string;
}

export interface Candle {
  readonly symbol: string;
  readonly epoch: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export type MarketFreshness = "FRESH" | "STALE" | "UNKNOWN";

export interface MarketSnapshot {
  readonly symbol: string;
  readonly tick: Tick | null;
  readonly freshness: MarketFreshness;
}
