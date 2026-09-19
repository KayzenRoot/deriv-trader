/**
 * Shared Feature Graph (DT-WP-03 §3).
 * Computes common market primitives once per symbol/time context and fans
 * immutable snapshots to all Runners. Pure functions over tick windows at or
 * before the decision time — never future data. Versioned + hashed.
 */
import { createHash } from "node:crypto";
import type { MarketTick } from "@deriv-trader/domain";

export const FEATURE_VERSION = "sfg-1";

export interface FeatureSnapshot {
  readonly featureVersion: string;
  readonly symbol: string;
  readonly eventTime: number;
  readonly provenance: string;
  readonly values: Record<string, number>;
  readonly freshness: "FRESH" | "STALE";
  readonly anomaly: boolean;
  readonly hash: string;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  return median(values.map((v) => Math.abs(v - med)));
}

/** Least-squares slope of y over x=0..n-1 (robust: caller trims inputs). */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const v = values[i] ?? 0;
    num += (i - xMean) * (v - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let acc = values[0] ?? 0;
  for (let i = 1; i < values.length; i += 1) acc += alpha * ((values[i] ?? 0) - acc);
  return acc;
}

function rsiLike(gains: number[], losses: number[]): number {
  const avgGain = mean(gains);
  const avgLoss = mean(losses);
  if (avgGain + avgLoss === 0) return 50;
  return (100 * avgGain) / (avgGain + avgLoss);
}

export interface FeatureOptions {
  readonly windows?: readonly number[];
  readonly anomalyJump?: number;
}

/**
 * Compute the full primitive set over ticks at or before `atTime`.
 * Returns null when history is insufficient for the largest window.
 */
export function computeFeatures(
  ticks: readonly MarketTick[],
  symbol: string,
  atTime: number,
  provenance: string,
  options: FeatureOptions = {},
): FeatureSnapshot | null {
  const windows = options.windows ?? [5, 10, 20, 50];
  const maxWindow = Math.max(...windows);
  const jumpThreshold = options.anomalyJump ?? 0.02;
  const past = ticks
    .filter((t) => t.underlyingSymbol === symbol && t.eventTime <= atTime)
    .sort((a, b) => a.eventTime - b.eventTime || a.sequence - b.sequence);
  if (past.length < maxWindow + 1) return null;
  const closes = past.map((t) => t.quote);
  const values: Record<string, number> = {};
  const last = closes[closes.length - 1] ?? 0;

  for (const window of windows) {
    const slice = closes.slice(-window - 1);
    const base = slice[0] ?? last;
    const ret = base === 0 ? 0 : (last - base) / base;
    values[`return_${String(window)}`] = ret;
    values[`logreturn_${String(window)}`] = base > 0 && last > 0 ? Math.log(last / base) : 0;
    values[`slope_${String(window)}`] = slice.length > 1 && base !== 0 ? slope(slice) / base : 0;
  }

  const logrets: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1] ?? 0;
    const curr = closes[i] ?? 0;
    logrets.push(prev > 0 && curr > 0 ? Math.log(curr / prev) : 0);
  }
  values["volatility_20"] = stdev(logrets.slice(-20));
  values["volatility_50"] = stdev(logrets.slice(-50));

  const window50 = closes.slice(-50);
  const high = Math.max(...window50);
  const low = Math.min(...window50);
  values["range_high_50"] = high;
  values["range_low_50"] = low;
  values["range_position_50"] = high === low ? 0.5 : (last - low) / (high - low);

  values["mean_20"] = mean(closes.slice(-20));
  values["median_20"] = median(closes.slice(-20));
  values["dispersion_mad_20"] = mad(closes.slice(-20));
  const med = values["median_20"] ?? 0;
  const dispersion = values["dispersion_mad_20"] ?? 0;
  values["zscore_20"] = dispersion === 0 ? 0 : (last - med) / (1.4826 * dispersion);
  const sd20 = stdev(closes.slice(-20));
  values["zscore_classic_20"] = sd20 === 0 ? 0 : (last - (values["mean_20"] ?? 0)) / sd20;

  const changes = logrets.slice(-14);
  const gains = changes.map((c) => Math.max(0, c));
  const losses = changes.map((c) => Math.max(0, -c));
  values["rsi_14"] = rsiLike(gains, losses);

  const signs = logrets.slice(-20).map((c) => (c > 0 ? 1 : c < 0 ? -1 : 0));
  const up = signs.filter((s) => s === 1).length;
  const down = signs.filter((s) => s === -1).length;
  values["persistence_20"] = signs.length === 0 ? 0 : (up - down) / signs.length;
  let maxRun = 0;
  let run = 0;
  let lastSign = 0;
  for (const s of signs) {
    if (s !== 0 && s === lastSign) {
      run += 1;
    } else {
      run = s === 0 ? 0 : 1;
      lastSign = s;
    }
    maxRun = Math.max(maxRun, run);
  }
  values["max_run_20"] = maxRun;

  const slope10 = values["slope_10"] ?? 0;
  const slope20 = values["slope_20"] ?? 0;
  values["acceleration"] = slope10 - slope20;

  const firstTime = past[0]?.eventTime ?? atTime;
  const lastTime = past[past.length - 1]?.eventTime ?? atTime;
  const spanSeconds = lastTime - firstTime;
  values["tick_rate_50"] = spanSeconds <= 0 ? 0 : Math.min(50, past.length) / spanSeconds;
  const perTick = logrets.slice(-10);
  values["price_change_per_tick_10"] = mean(perTick.map((c) => Math.abs(c)));
  const net = Math.abs(perTick.reduce((a, b) => a + b, 0));
  const gross = perTick.reduce((a, b) => a + Math.abs(b), 0);
  values["efficiency_10"] = gross === 0 ? 0 : net / gross;

  const range = high - low;
  values["compression_50"] = last === 0 ? 0 : range / last / Math.max(1e-12, values["volatility_50"] ?? 0);
  values["expansion_ratio"] = (values["volatility_20"] ?? 0) / Math.max(1e-12, values["volatility_50"] ?? 0);

  // Adaptive Price Anchor: EMA-anchored level (explicitly NOT VWAP — no volume).
  const anchor = ema(closes.slice(-50), 20);
  values["anchor_ema20_50"] = anchor;
  values["anchor_distance"] = anchor === 0 ? 0 : (last - anchor) / anchor;

  let anomaly = false;
  for (const c of logrets.slice(-3)) {
    if (Math.abs(c) > jumpThreshold) anomaly = true;
  }
  const snapshot: Omit<FeatureSnapshot, "hash"> = {
    featureVersion: FEATURE_VERSION,
    symbol,
    eventTime: atTime,
    provenance,
    values,
    freshness: "FRESH",
    anomaly,
  };
  return { ...snapshot, hash: hashSnapshot(snapshot) };
}

export function hashSnapshot(snapshot: Omit<FeatureSnapshot, "hash">): string {
  const keys = Object.keys(snapshot.values).sort();
  const canonical = `${snapshot.featureVersion}|${snapshot.symbol}|${String(snapshot.eventTime)}|${snapshot.provenance}|${keys.map((k) => `${k}=${String(snapshot.values[k] ?? 0)}`).join(",")}|${snapshot.freshness}|${String(snapshot.anomaly)}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Shared Feature Graph: bounded per-symbol ring buffers, one computation per
 * symbol/time, immutable snapshots fanned out to all Runners.
 */
export class SharedFeatureGraph {
  private readonly buffers = new Map<string, MarketTick[]>();
  private readonly capacity: number;
  private computations = 0;

  constructor(capacity = 500) {
    this.capacity = capacity;
  }

  ingest(tick: MarketTick): void {
    const buffer = this.buffers.get(tick.underlyingSymbol) ?? [];
    buffer.push(tick);
    if (buffer.length > this.capacity) buffer.splice(0, buffer.length - this.capacity);
    this.buffers.set(tick.underlyingSymbol, buffer);
  }

  snapshot(
    symbol: string,
    atTime: number,
    provenance: string,
    options: FeatureOptions = {},
  ): FeatureSnapshot | null {
    this.computations += 1;
    return computeFeatures(this.buffers.get(symbol) ?? [], symbol, atTime, provenance, options);
  }

  computationCount(): number {
    return this.computations;
  }

  bufferedSymbols(): string[] {
    return [...this.buffers.keys()].sort();
  }
}
