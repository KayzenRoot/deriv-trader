/**
 * Multi-Runner portfolio research simulator (DT-WP-03 §19).
 * Pure research: consumes immutable strategy signals without modifying them
 * and without creating confluence. Versioned research-only slot policy (never
 * imports the future production Risk Engine from WP-04).
 */
import type { SettledDecision } from "./replay.js";

export interface SimulatorPolicy {
  readonly version: string;
  readonly maxSimultaneous: number;
  readonly maxPerInstrument: number;
  readonly cooldownSeconds: number;
  readonly dailyStopLoss: number | null;
  readonly dailyTarget: number | null;
  readonly fixedStake: number;
}

export const SIMULATOR_POLICY_VERSION = "sim-policy-1";

export interface SimulatorSignal {
  readonly time: number;
  readonly runnerId: string;
  readonly instrument: string;
  readonly expirySeconds: number;
  readonly signal: "SIGNAL_CALL" | "SIGNAL_PUT";
  readonly realized: number | null;
}

export interface SimulatorFill {
  readonly signal: SimulatorSignal;
  readonly admitted: boolean;
  readonly blockedReason: string | null;
}

export interface SimulatorMetrics {
  readonly fills: number;
  readonly blockedSlot: number;
  readonly blockedInstrument: number;
  readonly blockedCooldown: number;
  readonly blockedDaily: number;
  readonly portfolioPnl: number;
  readonly maxDrawdown: number;
  readonly maxSimultaneousUsed: number;
  readonly worstLossCluster: number;
  /** Maximum concurrently open losing-contract cluster (not consecutive fills). */
  readonly worstOverlappingLossCluster: number;
  readonly contributionByRunner: Record<string, number>;
  readonly contributionByInstrument: Record<string, number>;
  readonly starvedRunners: string[];
  readonly unknownSettlements: number;
  readonly settlementEvents: number;
}

interface OpenPosition {
  readonly signal: SimulatorSignal;
  readonly admittedAt: number;
  readonly releaseAt: number;
}

/** Deterministic signal-ready ordering: time, runner, instrument, expiry. */
export function orderSignals(signals: SimulatorSignal[]): SimulatorSignal[] {
  return [...signals].sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.runnerId !== b.runnerId) return a.runnerId < b.runnerId ? -1 : 1;
    if (a.instrument !== b.instrument) return a.instrument < b.instrument ? -1 : 1;
    return a.expirySeconds - b.expirySeconds;
  });
}

export function simulate(signals: SimulatorSignal[], policy: SimulatorPolicy): SimulatorMetrics {
  const ordered = orderSignals(signals);
  const open: OpenPosition[] = [];
  const settledPositions: OpenPosition[] = [];
  const fills: SimulatorFill[] = [];
  const lastFillAt = new Map<string, number>();
  const dailyPnl = new Map<string, number>();
  let blockedSlot = 0;
  let blockedInstrument = 0;
  let blockedCooldown = 0;
  let blockedDaily = 0;
  let maxSimultaneousUsed = 0;
  const contributionByRunner: Record<string, number> = {};
  const contributionByInstrument: Record<string, number> = {};
  const seenRunners = new Set<string>();
  const filledRunners = new Set<string>();
  const lossIntervals: { readonly start: number; readonly end: number }[] = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let unknownSettlements = 0;
  let settlementEvents = 0;

  const settlePosition = (position: OpenPosition): void => {
    settledPositions.push(position);
    settlementEvents += 1;
    const realized = position.signal.realized;
    if (realized === null) {
      unknownSettlements += 1;
      return;
    }
    const settlementTime = position.releaseAt;
    const pnl = realized * policy.fixedStake;
    equity += pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    const date = new Date(settlementTime * 1000).toISOString().slice(0, 10);
    dailyPnl.set(date, (dailyPnl.get(date) ?? 0) + pnl);
    contributionByRunner[position.signal.runnerId] =
      (contributionByRunner[position.signal.runnerId] ?? 0) + pnl;
    contributionByInstrument[position.signal.instrument] =
      (contributionByInstrument[position.signal.instrument] ?? 0) + pnl;
    if (realized < 0) lossIntervals.push({ start: position.admittedAt, end: position.releaseAt });
  };

  const settleDue = (time: number): void => {
    const due = open
      .filter((position) => position.releaseAt <= time)
      .sort((a, b) => a.releaseAt - b.releaseAt || a.signal.runnerId.localeCompare(b.signal.runnerId));
    for (const position of due) {
      const index = open.indexOf(position);
      if (index >= 0) open.splice(index, 1);
      settlePosition(position);
    }
  };

  for (const signal of ordered) {
    seenRunners.add(signal.runnerId);
    // Settlement events are processed before an admission at the same time.
    // This prevents a future loss from affecting daily state before expiry.
    settleDue(signal.time);
    const date = new Date(signal.time * 1000).toISOString().slice(0, 10);
    const day = dailyPnl.get(date) ?? 0;
    if (policy.dailyStopLoss !== null && day <= -policy.dailyStopLoss) {
      blockedDaily += 1;
      fills.push({ signal, admitted: false, blockedReason: "DAILY_STOP" });
      continue;
    }
    if (policy.dailyTarget !== null && day >= policy.dailyTarget) {
      blockedDaily += 1;
      fills.push({ signal, admitted: false, blockedReason: "DAILY_TARGET" });
      continue;
    }
    const live = open.filter((p) => p.releaseAt > signal.time);
    if (live.length >= policy.maxSimultaneous) {
      blockedSlot += 1;
      fills.push({ signal, admitted: false, blockedReason: "SLOT_EXHAUSTED" });
      continue;
    }
    if (live.filter((p) => p.signal.instrument === signal.instrument).length >= policy.maxPerInstrument) {
      blockedInstrument += 1;
      fills.push({ signal, admitted: false, blockedReason: "INSTRUMENT_CAP" });
      continue;
    }
    const last = lastFillAt.get(`${signal.runnerId}|${signal.instrument}`) ?? Number.NEGATIVE_INFINITY;
    if (signal.time - last < policy.cooldownSeconds) {
      blockedCooldown += 1;
      fills.push({ signal, admitted: false, blockedReason: "COOLDOWN" });
      continue;
    }
    open.push({
      signal,
      admittedAt: signal.time,
      releaseAt: signal.time + signal.expirySeconds,
    });
    maxSimultaneousUsed = Math.max(maxSimultaneousUsed, open.filter((p) => p.releaseAt > signal.time).length);
    lastFillAt.set(`${signal.runnerId}|${signal.instrument}`, signal.time);
    filledRunners.add(signal.runnerId);
    fills.push({ signal, admitted: true, blockedReason: null });
  }

  // Flush open settlements after the final admission before reporting metrics.
  settleDue(Number.POSITIVE_INFINITY);
  let worstLossCluster = 0;
  const events = lossIntervals.flatMap((interval) => [
    { time: interval.start, delta: 1, kind: 1 },
    { time: interval.end, delta: -1, kind: 0 },
  ]).sort((a, b) => a.time - b.time || a.kind - b.kind);
  let activeLosses = 0;
  for (const event of events) {
    activeLosses += event.delta;
    worstLossCluster = Math.max(worstLossCluster, activeLosses);
  }
  return {
    fills: fills.filter((f) => f.admitted).length,
    blockedSlot,
    blockedInstrument,
    blockedCooldown,
    blockedDaily,
    portfolioPnl: equity,
    maxDrawdown,
    maxSimultaneousUsed,
    worstLossCluster,
    worstOverlappingLossCluster: worstLossCluster,
    contributionByRunner,
    contributionByInstrument,
    starvedRunners: [...seenRunners].filter((r) => !filledRunners.has(r)).sort(),
    unknownSettlements,
    settlementEvents,
  };
}

export function toSimulatorSignals(decisions: readonly SettledDecision[]): SimulatorSignal[] {
  return decisions
    .filter((d) => d.signal !== "NO_SIGNAL")
    .map((d) => ({
      time: d.time,
      // Real runner identity: expiry-specific, so independent expiry runners
      // never share cooldown/instrument accounting.
      runnerId: d.runnerId,
      instrument: d.instrument,
      expirySeconds: d.expirySeconds,
      signal: d.signal as "SIGNAL_CALL" | "SIGNAL_PUT",
      realized: d.realized,
    }));
}
