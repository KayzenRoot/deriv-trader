/**
 * Shared tick hub + Market Freshness Matrix (DT-WP-02 Phases C/E).
 * One external subscription per unique underlying symbol, fanned out to any
 * number of internal consumers. Duplicate/out-of-order/gap conditions are
 * detected per symbol and feed freshness states.
 */
import type { Clock, MarketDataSource, MarketTick } from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

export type FreshnessState = "FRESH" | "AGING" | "STALE" | "GAPPED" | "UNTRUSTED";

export interface FreshnessInput {
  readonly tickAgeMs: number | null;
  readonly gapDetected: boolean;
  readonly connectionHealthy: boolean;
  readonly trusted: boolean;
}

export interface FreshnessThresholds {
  readonly freshMs: number;
  readonly agingMs: number;
}

export const DEFAULT_THRESHOLDS: FreshnessThresholds = {
  freshMs: 5000,
  agingMs: 15000,
};

export function classifyFreshness(
  input: FreshnessInput,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): FreshnessState {
  if (!input.trusted) return "UNTRUSTED";
  if (!input.connectionHealthy) return "STALE";
  if (input.gapDetected) return "GAPPED";
  if (input.tickAgeMs === null) return "STALE";
  if (input.tickAgeMs <= thresholds.freshMs) return "FRESH";
  if (input.tickAgeMs <= thresholds.agingMs) return "AGING";
  return "STALE";
}

interface SymbolStream {
  consumers: Set<(tick: MarketTick) => void>;
  unsubscribe: (() => Promise<void>) | null;
  lastEventTime: number | null;
  lastSeenAt: number;
  gap: boolean;
  untrusted: boolean;
  count: number;
}

export class SharedTickHub {
  private readonly source: MarketDataSource;
  private readonly clock: Clock;
  private readonly streams = new Map<string, SymbolStream>();
  private sequence = 0;

  constructor(source: MarketDataSource, clock?: Clock) {
    this.source = source;
    this.clock = clock ?? systemClock();
  }

  /** Active external subscription count (one per unique symbol). */
  externalCount(): number {
    let count = 0;
    for (const stream of this.streams.values()) {
      if (stream.unsubscribe !== null) count += 1;
    }
    return count;
  }

  consumerCount(underlyingSymbol: string): number {
    return this.streams.get(underlyingSymbol)?.consumers.size ?? 0;
  }

  async subscribe(
    underlyingSymbol: string,
    consumer: (tick: MarketTick) => void,
  ): Promise<() => Promise<void>> {
    let stream = this.streams.get(underlyingSymbol);
    if (!stream) {
      stream = {
        consumers: new Set(),
        unsubscribe: null,
        lastEventTime: null,
        lastSeenAt: this.clock.nowMs(),
        gap: false,
        untrusted: false,
        count: 0,
      };
      this.streams.set(underlyingSymbol, stream);
    }
    stream.consumers.add(consumer);
    if (!stream.unsubscribe) {
      const active = this.streams.get(underlyingSymbol);
      const { unsubscribe } = await this.source.subscribeTicks(underlyingSymbol, (tick) => {
        this.dispatch(underlyingSymbol, tick);
      });
      const current = this.streams.get(underlyingSymbol);
      if (current && current === active) {
        current.unsubscribe = unsubscribe;
      } else {
        await unsubscribe();
      }
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      const current = this.streams.get(underlyingSymbol);
      if (!current) return;
      current.consumers.delete(consumer);
      if (current.consumers.size === 0) {
        const stop = current.unsubscribe;
        current.unsubscribe = null;
        this.streams.delete(underlyingSymbol);
        if (stop) await stop().catch(() => undefined);
      }
    };
  }

  private dispatch(underlyingSymbol: string, tick: MarketTick): void {
    const stream = this.streams.get(underlyingSymbol);
    if (!stream) return;
    this.sequence += 1;
    const now = this.clock.nowMs();
    let enriched = { ...tick, sequence: this.sequence };
    if (stream.lastEventTime !== null) {
      if (tick.eventTime === stream.lastEventTime) {
        enriched = { ...enriched, duplicate: true };
      } else if (tick.eventTime < stream.lastEventTime) {
        enriched = { ...enriched, outOfOrder: true };
      } else if (tick.eventTime - stream.lastEventTime > 30) {
        enriched = { ...enriched, gap: true };
        stream.gap = true;
      }
    }
    stream.lastEventTime = Math.max(stream.lastEventTime ?? tick.eventTime, tick.eventTime);
    stream.lastSeenAt = now;
    stream.count += 1;
    for (const consumer of stream.consumers) consumer(enriched);
  }

  /** Feed a tick directly (tests / history bootstrap path). */
  ingest(tick: MarketTick): void {
    this.dispatch(tick.underlyingSymbol, tick);
  }

  markUntrusted(underlyingSymbol: string): void {
    const stream = this.streams.get(underlyingSymbol);
    if (stream) stream.untrusted = true;
  }

  /** Reconnect invalidation: dependent authority goes stale until fresh data. */
  invalidateAll(): void {
    for (const stream of this.streams.values()) {
      stream.lastEventTime = null;
      stream.gap = true;
    }
  }

  freshness(
    underlyingSymbol: string,
    connectionHealthy: boolean,
    thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
  ): FreshnessState {
    const stream = this.streams.get(underlyingSymbol);
    if (!stream) return "STALE";
    const ageMs = stream.count === 0 ? null : this.clock.nowMs() - stream.lastSeenAt;
    return classifyFreshness(
      {
        tickAgeMs: ageMs,
        gapDetected: stream.gap,
        connectionHealthy,
        trusted: !stream.untrusted,
      },
      thresholds,
    );
  }
}
