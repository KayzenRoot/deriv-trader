/**
 * Deterministic replay / backtest engine (DT-WP-03 §4).
 * Two separated modes: market-only (direction study, payout UNKNOWN) and
 * proposal-aware (as-of join of captured snapshots at decision time only).
 * Monotonic event clock, tolerance-bounded settlement lookup, run manifests.
 *
 * Flow per decision: SFG snapshot (past data only) -> strategy direction
 * vote -> as-of proposal join for the CHOSEN direction -> settlement lookup
 * -> label -> metrics. Strategies never see future data or future proposals.
 */
import { createHash } from "node:crypto";
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";
import { SharedFeatureGraph, type FeatureSnapshot } from "@deriv-trader/strategies";

export type ReplayMode = "market-only" | "proposal-aware";

export type OutcomeLabel = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export interface ReplayDecision {
  readonly time: number;
  readonly signal: "SIGNAL_CALL" | "SIGNAL_PUT" | "NO_SIGNAL";
  readonly strategyId: string;
  readonly instrument: string;
  readonly expirySeconds: 60 | 180 | 300;
  readonly presetVersion: string;
  readonly featureHash: string;
  readonly quality: number;
  readonly proposalKey: string | null;
  readonly effectivePayout: number | null;
  readonly breakEven: number | null;
  readonly reason: string;
}

export interface SettledDecision extends ReplayDecision {
  readonly targetTime: number;
  readonly label: OutcomeLabel;
  /** Realized P&L per unit stake when proposal-aware with KNOWN economics. */
  readonly realized: number | null;
  /** Directional points (+1/-1/0) for market-only study — never money. */
  readonly points: number | null;
}

export interface ReplayManifest {
  readonly mode: ReplayMode;
  readonly codeVersion: string;
  readonly datasetHash: string;
  readonly featureVersion: string;
  readonly strategyVersions: Record<string, string>;
  readonly presetVersion: string;
  readonly configHash: string;
  readonly seed: number;
  readonly decisions: number;
  readonly decisionsHash: string;
  readonly fromTime: number;
  readonly toTime: number;
}

/** Latest valid proposal at or before decision time for the exact key. */
export function joinProposal(
  proposals: readonly ProposalQuote[],
  key: string,
  decisionTimeMs: number,
): ProposalQuote | null {
  let best: ProposalQuote | null = null;
  let bestAt = -1;
  for (const quote of proposals) {
    if (quote.key !== key) continue;
    if (quote.state !== "KNOWN") continue;
    const at = Date.parse(quote.receivedAt);
    if (!Number.isFinite(at) || at > decisionTimeMs) continue;
    if (at >= bestAt) {
      bestAt = at;
      best = quote;
    }
  }
  return best;
}

/** Settlement lookup at/after target within tolerance; UNKNOWN when thin. */
export function settle(
  ticks: readonly MarketTick[],
  entryQuote: number,
  targetTime: number,
  toleranceSeconds: number,
  flatEpsilon: number,
): { label: OutcomeLabel; quote: number | null } {
  let candidate: MarketTick | null = null;
  for (const tick of ticks) {
    if (tick.eventTime < targetTime) continue;
    if (tick.eventTime - targetTime > toleranceSeconds) break;
    candidate = tick;
    break;
  }
  if (!candidate) return { label: "UNKNOWN", quote: null };
  const change = candidate.quote - entryQuote;
  if (Math.abs(change) <= flatEpsilon) return { label: "FLAT", quote: candidate.quote };
  return { label: change > 0 ? "UP" : "DOWN", quote: candidate.quote };
}

export interface ReplayRunner {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly runnerId: string;
  readonly expirySeconds: 60 | 180 | 300;
  readonly presetVersion: string;
  decide: (features: FeatureSnapshot) => {
    signal: ReplayDecision["signal"];
    quality: number;
    reason: string;
  };
}

export interface ReplayInput {
  readonly mode: ReplayMode;
  readonly ticks: readonly MarketTick[];
  readonly proposals: readonly ProposalQuote[];
  readonly runners: readonly ReplayRunner[];
  readonly fromTime: number;
  readonly toTime: number;
  readonly stepTicks: number;
  readonly settlementToleranceSeconds: number;
  readonly flatEpsilon: number;
  readonly proposalAmount: number;
  readonly proposalCurrency: string;
  readonly proposalBasis: string;
  readonly codeVersion: string;
  readonly datasetHash: string;
  readonly featureVersion: string;
  readonly configHash: string;
  readonly seed: number;
}

export interface ReplayOutput {
  readonly decisions: SettledDecision[];
  readonly manifest: ReplayManifest;
}

/** Deterministic replay: chronological, no future access, stable manifest. */
export function runReplay(input: ReplayInput): ReplayOutput {
  const ticks = [...input.ticks]
    .filter((t) => t.eventTime >= input.fromTime && t.eventTime <= input.toTime)
    .sort((a, b) => a.eventTime - b.eventTime || a.sequence - b.sequence);
  const orderedRunners = [...input.runners].sort((a, b) => (a.runnerId < b.runnerId ? -1 : 1));
  const graph = new SharedFeatureGraph(2000);
  const settled: SettledDecision[] = [];
  for (let i = 0; i < ticks.length; i += 1) {
    const tick = ticks[i];
    if (!tick) continue;
    graph.ingest(tick);
    if (i % Math.max(1, input.stepTicks) !== 0) continue;
    const snapshot = graph.snapshot(tick.underlyingSymbol, tick.eventTime, input.datasetHash);
    for (const runner of orderedRunners) {
      let vote: { signal: ReplayDecision["signal"]; quality: number; reason: string };
      if (!snapshot) {
        vote = { signal: "NO_SIGNAL", quality: 0, reason: "insufficient history" };
      } else {
        vote = runner.decide(snapshot);
      }
      let proposalKey: string | null = null;
      let effectivePayout: number | null = null;
      let breakEven: number | null = null;
      if (input.mode === "proposal-aware" && vote.signal !== "NO_SIGNAL" && snapshot) {
        const direction = vote.signal === "SIGNAL_CALL" ? "CALL" : "PUT";
        const key = [
          tick.underlyingSymbol,
          direction,
          String(runner.expirySeconds),
          input.proposalCurrency,
          input.proposalBasis,
          String(input.proposalAmount),
        ].join("|");
        const quote = joinProposal(input.proposals, key, tick.eventTime * 1000);
        if (quote) {
          proposalKey = quote.key;
          effectivePayout = quote.effectivePayout;
          breakEven = quote.breakEven;
        }
      }
      const targetTime = tick.eventTime + runner.expirySeconds;
      const { label } = settle(
        ticks.slice(i + 1),
        tick.quote,
        targetTime,
        input.settlementToleranceSeconds,
        input.flatEpsilon,
      );
      settled.push({
        time: tick.eventTime,
        signal: vote.signal,
        strategyId: runner.strategyId,
        instrument: tick.underlyingSymbol,
        expirySeconds: runner.expirySeconds,
        presetVersion: runner.presetVersion,
        featureHash: snapshot?.hash ?? "none",
        quality: vote.quality,
        proposalKey,
        effectivePayout,
        breakEven,
        reason: vote.reason,
        targetTime,
        label,
        realized:
          input.mode === "proposal-aware" && label !== "UNKNOWN"
            ? realizedPnl(vote.signal, label, effectivePayout)
            : null,
        points:
          input.mode === "market-only" && label !== "UNKNOWN"
            ? directionalPoints(vote.signal, label)
            : null,
      });
    }
  }
  const decisionsHash = createHash("sha256")
    .update(JSON.stringify(settled.map((d) => [d.time, d.strategyId, d.signal, d.label, d.reason])))
    .digest("hex");
  const versions: Record<string, string> = {};
  for (const runner of orderedRunners) versions[runner.strategyId] = runner.strategyVersion;
  return {
    decisions: settled,
    manifest: {
      mode: input.mode,
      codeVersion: input.codeVersion,
      datasetHash: input.datasetHash,
      featureVersion: input.featureVersion,
      strategyVersions: versions,
      presetVersion: "seed-1",
      configHash: input.configHash,
      seed: input.seed,
      decisions: settled.length,
      decisionsHash,
      fromTime: input.fromTime,
      toTime: input.toTime,
    },
  };
}

function realizedPnl(
  signal: ReplayDecision["signal"],
  label: OutcomeLabel,
  effectivePayout: number | null,
): number | null {
  if (signal === "NO_SIGNAL" || label === "UNKNOWN" || label === "FLAT") return 0;
  if (effectivePayout === null) return null;
  const won =
    (signal === "SIGNAL_CALL" && label === "UP") || (signal === "SIGNAL_PUT" && label === "DOWN");
  return won ? effectivePayout : -1;
}

function directionalPoints(
  signal: ReplayDecision["signal"],
  label: OutcomeLabel,
): number | null {
  if (signal === "NO_SIGNAL" || label === "UNKNOWN" || label === "FLAT") return 0;
  const won =
    (signal === "SIGNAL_CALL" && label === "UP") || (signal === "SIGNAL_PUT" && label === "DOWN");
  return won ? 1 : -1;
}
