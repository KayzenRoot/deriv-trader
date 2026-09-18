/**
 * Market-data boundary (DT-WP-01 Phase F).
 * Types/interfaces that DT-WP-02 can implement. No capture yet.
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
