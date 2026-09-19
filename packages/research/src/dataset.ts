/**
 * Deterministic synthetic research dataset builder (DT-WP-03).
 * Seeded PRNG (mulberry32) generates regime-structured tick streams plus
 * proposal snapshots for fixtures and pipeline tests. Synthetic data is
 * labeled as such everywhere — it exercises machinery, never proves edge.
 */
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";
import { proposalKey } from "@deriv-trader/domain";

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export type SyntheticRegime = "trend_up" | "trend_down" | "range" | "breakout_up" | "micro_burst";

export interface SyntheticSpec {
  readonly symbol: string;
  readonly startEpoch: number;
  readonly ticks: number;
  readonly basePrice: number;
  readonly seed: number;
  readonly regimes: readonly SyntheticRegime[];
}

/**
 * Generate a deterministic tick stream. Regime segments cycle in order;
 * gaussian-ish noise comes from summed PRNG draws (seeded, reproducible).
 */
export function generateTicks(spec: SyntheticSpec): MarketTick[] {
  const rand = mulberry32(spec.seed);
  const noise = (): number => (rand() + rand() + rand() - 1.5) / 1.5;
  const out: MarketTick[] = [];
  let price = spec.basePrice;
  const perRegime = Math.max(1, Math.floor(spec.ticks / Math.max(1, spec.regimes.length)));
  for (let i = 0; i < spec.ticks; i += 1) {
    const regime = spec.regimes[Math.floor(i / perRegime) % spec.regimes.length] ?? "range";
    const drift =
      regime === "trend_up" ? 0.0006
      : regime === "trend_down" ? -0.0006
      : regime === "breakout_up" && i % perRegime > perRegime * 0.7 ? 0.0012
      : 0;
    const shock = regime === "micro_burst" && i % 17 === 0 ? 0.004 * (rand() > 0.5 ? 1 : -1) : 0;
    const wave = regime === "range" ? 0.0008 * Math.sin(i / 6) : 0;
    price *= 1 + drift + wave * 0.2 + noise() * 0.0004 + shock;
    out.push({
      underlyingSymbol: spec.symbol,
      eventTime: spec.startEpoch + i,
      receiveTime: new Date((spec.startEpoch + i) * 1000).toISOString(),
      quote: price,
      pipSize: 0.0001,
      sourceConnectionId: "synthetic",
      reqId: null,
      subscriptionId: null,
      sequence: i,
      stale: false,
      gap: false,
      outOfOrder: false,
      duplicate: false,
    });
  }
  return out;
}

export interface SyntheticProposalSpec {
  readonly symbols: readonly string[];
  readonly expiries: readonly (60 | 180 | 300)[];
  readonly effectivePayout: number;
  readonly startEpoch: number;
  readonly everyTicks: number;
  readonly amount?: number;
  readonly currency?: string;
  /** Repeat rounds spread across the timeline (default 1). */
  readonly rounds?: number;
}

/** Proposal snapshots sampled prospectively along the tick timeline. */
export function generateProposals(spec: SyntheticProposalSpec): ProposalQuote[] {
  const out: ProposalQuote[] = [];
  const amount = spec.amount ?? 10;
  const currency = spec.currency ?? "USD";
  const rounds = spec.rounds ?? 1;
  for (let round = 0; round < rounds; round += 1) {
    let step = 0;
    for (const symbol of spec.symbols) {
      for (const expiry of spec.expiries) {
        for (const direction of ["CALL", "PUT"] as const) {
          const assumptions = {
            contractType: direction,
            underlyingSymbol: symbol,
            durationSeconds: expiry,
            amount,
            basis: "stake",
            currency,
          };
          const askPrice = 10;
          const payout = askPrice * (1 + spec.effectivePayout);
          const at = spec.startEpoch + round * spec.everyTicks * 6 + step * 2;
          out.push({
            key: proposalKey(assumptions),
            assumptions,
            proposalId: `syn-${symbol}-${direction}-${String(expiry)}-r${String(round)}`,
            askPrice,
            payout,
            effectivePayout: spec.effectivePayout,
            breakEven: askPrice / payout,
            state: "KNOWN",
            requestedAt: new Date(at * 1000).toISOString(),
            receivedAt: new Date(at * 1000).toISOString(),
            source: "synthetic",
          });
          step += 1;
        }
      }
    }
  }
  return out;
}
