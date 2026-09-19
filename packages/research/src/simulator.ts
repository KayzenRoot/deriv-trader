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
  readonly contributionByRunner: Record<string, number>;
  readonly contributionByInstrument: Record<string, number>;
  readonly starvedRunners: string[];
}

interface OpenPosition {
  readonly runnerId: string;
  readonly instrument: string;
  readonly releaseAt: number;
  readonly realized: number;
  readonly date: string;
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

  for (const signal of ordered) {
    seenRunners.add(signal.runnerId);
    // Release expired positions before admission (no delayed stale queue).
    for (let i = open.length - 1; i >= 0; i -= 1) {
      const position = open[i];
      if (position && position.releaseAt <= signal.time) open.splice(i, 1);
    }
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
    if (live.filter((p) => p.instrument === signal.instrument).length >= policy.maxPerInstrument) {
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
    const realized = signal.realized ?? 0;
    open.push({
      runnerId: signal.runnerId,
      instrument: signal.instrument,
      releaseAt: signal.time + signal.expirySeconds,
      realized,
      date,
    });
    maxSimultaneousUsed = Math.max(maxSimultaneousUsed, open.filter((p) => p.releaseAt > signal.time).length);
    lastFillAt.set(`${signal.runnerId}|${signal.instrument}`, signal.time);
    dailyPnl.set(date, day + realized * policy.fixedStake);
    contributionByRunner[signal.runnerId] = (contributionByRunner[signal.runnerId] ?? 0) + realized * policy.fixedStake;
    contributionByInstrument[signal.instrument] =
      (contributionByInstrument[signal.instrument] ?? 0) + realized * policy.fixedStake;
    filledRunners.add(signal.runnerId);
    fills.push({ signal, admitted: true, blockedReason: null });
  }

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let lossRun = 0;
  let worstLossCluster = 0;
  for (const fill of fills) {
    if (!fill.admitted) continue;
    const pnl = (fill.signal.realized ?? 0) * policy.fixedStake;
    equity += pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    if (pnl < 0) {
      lossRun += 1;
      worstLossCluster = Math.max(worstLossCluster, lossRun);
    } else {
      lossRun = 0;
    }
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
    contributionByRunner,
    contributionByInstrument,
    starvedRunners: [...seenRunners].filter((r) => !filledRunners.has(r)).sort(),
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
