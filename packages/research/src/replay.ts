/**
 * Deterministic replay / backtest engine (DT-WP-03 §4, CORRECTION 001).
 * Symbol-bound throughout: per-symbol cadence, per-symbol settlement, exact
 * symbol delivery to runners, explicit same-timestamp ordering. Proposal joins
 * are TTL-gated by a versioned economics policy. Digests bind full identity.
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

export const REPLAY_ECONOMICS_VERSION = "replay-econ-1";

/**
 * Default proposal TTL for synthetic research runs: a KNOWN proposal only
 * counts as monetary evidence for decisions within 60s of its receipt.
 * Real-history runs must justify their own TTL explicitly.
 */
export const DEFAULT_PROPOSAL_TTL_MS = 60_000;

export interface ReplayEconomicsPolicy {
  readonly version: string;
  readonly proposalTtlMs: number;
  readonly amount: number;
  readonly currency: string;
  readonly basis: string;
}

export interface ReplayDecision {
  readonly time: number;
  readonly signal: "SIGNAL_CALL" | "SIGNAL_PUT" | "NO_SIGNAL";
  readonly strategyId: string;
  readonly runnerId: string;
  readonly instrument: string;
  readonly expirySeconds: 60 | 180 | 300;
  readonly presetVersion: string;
  readonly featureHash: string;
  readonly quality: number;
  readonly proposalKey: string | null;
  readonly proposalId?: string | null;
  readonly proposalReceivedAt: string | null;
  readonly proposalAgeMs: number | null;
  readonly askPrice?: number | null;
  readonly payout?: number | null;
  readonly effectivePayout: number | null;
  readonly breakEven: number | null;
  readonly reason: string;
  readonly economicsPolicy?: string;
  readonly configHash?: string;
  readonly datasetPassportHash?: string;
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
  readonly datasetPassportHash: string;
  readonly featureVersion: string;
  readonly strategyVersions: Record<string, string>;
  readonly presetVersions: Record<string, string>;
  readonly configHash: string;
  readonly economicsPolicy: string;
  readonly proposalTtlMs: number;
  readonly seed: number;
  readonly decisions: number;
  readonly decisionsHash: string;
  readonly fromTime: number;
  readonly toTime: number;
}

/** Canonical projection used for exact replay identity and evidence binding. */
export function canonicalReplayProjection(
  decisions: readonly SettledDecision[],
  input: Pick<ReplayInput, "economics" | "configHash" | "datasetPassportHash" | "featureVersion" | "codeVersion" | "seed">,
): readonly unknown[][] {
  return decisions.map((d) => [
    d.time,
    d.runnerId,
    d.strategyId,
    d.instrument,
    d.expirySeconds,
    d.presetVersion,
    d.featureHash,
    d.signal,
    d.quality,
    d.reason,
    d.proposalKey,
    d.proposalId,
    d.proposalReceivedAt,
    d.proposalAgeMs,
    d.askPrice,
    d.payout,
    d.effectivePayout,
    d.breakEven,
    d.targetTime,
    d.label,
    d.realized,
    d.points,
    input.economics.version,
    input.economics.proposalTtlMs,
    input.datasetPassportHash,
    input.featureVersion,
    input.codeVersion,
    input.configHash,
    input.seed,
  ]);
}

export function digestReplayDecisions(
  decisions: readonly SettledDecision[],
  input: Pick<ReplayInput, "economics" | "configHash" | "datasetPassportHash" | "featureVersion" | "codeVersion" | "seed">,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalReplayProjection(decisions, input)), "utf8")
    .digest("hex");
}

/**
 * Latest exact-key KNOWN proposal at or before decision time with age <= TTL
 * and complete economics. Anything else is not monetary evidence.
 */
export function joinProposal(
  proposals: readonly ProposalQuote[],
  key: string,
  decisionTimeMs: number,
  ttlMs: number,
): ProposalQuote | null {
  let best: ProposalQuote | null = null;
  let bestAt = -1;
  for (const quote of proposals) {
    if (quote.key !== key) continue;
    if (quote.state !== "KNOWN") continue;
    if (quote.askPrice === null || quote.payout === null) continue;
    if (quote.effectivePayout === null || quote.breakEven === null) continue;
    const at = Date.parse(quote.receivedAt);
    if (!Number.isFinite(at) || at > decisionTimeMs) continue;
    if (decisionTimeMs - at > ttlMs) continue;
    if (at >= bestAt) {
      bestAt = at;
      best = quote;
    }
  }
  return best;
}

/**
 * Settlement lookup at/after target within tolerance, restricted to the exact
 * symbol. Ticks from other instruments can never settle this decision.
 */
export function settle(
  ticks: readonly MarketTick[],
  underlyingSymbol: string,
  entryQuote: number,
  targetTime: number,
  toleranceSeconds: number,
  flatEpsilon: number,
): { label: OutcomeLabel; quote: number | null } {
  let candidate: MarketTick | null = null;
  for (const tick of ticks) {
    if (tick.underlyingSymbol !== underlyingSymbol) continue;
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
  decide: (args: {
    symbol: string;
    time: number;
    tick: MarketTick;
    features: FeatureSnapshot;
  }) => {
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
  readonly economics: ReplayEconomicsPolicy;
  readonly codeVersion: string;
  readonly datasetHash: string;
  /** Verified Dataset Passport hash; datasetHash is the legacy fallback. */
  readonly datasetPassportHash?: string;
  readonly featureVersion: string;
  readonly configHash: string;
  readonly seed: number;
}

export interface ReplayOutput {
  readonly decisions: SettledDecision[];
  readonly manifest: ReplayManifest;
}

/**
 * Deterministic replay. Ticks are grouped per symbol (each group sorted);
 * cadence steps each symbol independently so one symbol's density never
 * shifts another's decisions. Same-timestamp ticks order by symbol, then
 * decisions merge by (time, runnerId). No future access anywhere.
 */
export function runReplay(input: ReplayInput): ReplayOutput {
  const bySymbol = new Map<string, MarketTick[]>();
  for (const tick of input.ticks) {
    if (tick.eventTime < input.fromTime || tick.eventTime > input.toTime) continue;
    const group = bySymbol.get(tick.underlyingSymbol) ?? [];
    group.push(tick);
    bySymbol.set(tick.underlyingSymbol, group);
  }
  const symbols = [...bySymbol.keys()].sort();
  for (const group of bySymbol.values()) {
    group.sort((a, b) => a.eventTime - b.eventTime || a.sequence - b.sequence);
  }
  const orderedRunners = [...input.runners].sort((a, b) => (a.runnerId < b.runnerId ? -1 : 1));
  const graph = new SharedFeatureGraph(2000);
  const settled: SettledDecision[] = [];
  for (const symbol of symbols) {
    const stream = bySymbol.get(symbol) ?? [];
    for (let i = 0; i < stream.length; i += 1) {
      const tick = stream[i];
      if (!tick) continue;
      graph.ingest(tick);
      // Per-symbol cadence: position counts this symbol's ticks only, so one
      // symbol's density never shifts another symbol's decisions.
      if (i % Math.max(1, input.stepTicks) !== 0) continue;
      const snapshot = graph.snapshot(symbol, tick.eventTime, input.datasetHash);
      for (const runner of orderedRunners) {
        let vote: { signal: ReplayDecision["signal"]; quality: number; reason: string };
        if (!snapshot) {
          vote = { signal: "NO_SIGNAL", quality: 0, reason: "insufficient history" };
        } else {
          vote = runner.decide({ symbol, time: tick.eventTime, tick, features: snapshot });
        }
        let proposalKey: string | null = null;
        let proposalId: string | null = null;
        let proposalReceivedAt: string | null = null;
        let proposalAgeMs: number | null = null;
        let askPrice: number | null = null;
        let payout: number | null = null;
        let effectivePayout: number | null = null;
        let breakEven: number | null = null;
        if (input.mode === "proposal-aware" && vote.signal !== "NO_SIGNAL" && snapshot) {
          const direction = vote.signal === "SIGNAL_CALL" ? "CALL" : "PUT";
          const key = [
            symbol,
            direction,
            String(runner.expirySeconds),
            input.economics.currency,
            input.economics.basis,
            String(input.economics.amount),
          ].join("|");
          const quote = joinProposal(
            input.proposals,
            key,
            tick.eventTime * 1000,
            input.economics.proposalTtlMs,
          );
          if (quote) {
            proposalKey = quote.key;
            proposalId = quote.proposalId;
            proposalReceivedAt = quote.receivedAt;
            proposalAgeMs = tick.eventTime * 1000 - Date.parse(quote.receivedAt);
            askPrice = quote.askPrice;
            payout = quote.payout;
            effectivePayout = quote.effectivePayout;
            breakEven = quote.breakEven;
          }
        }
        const targetTime = tick.eventTime + runner.expirySeconds;
        const { label } = settle(
          stream.slice(i + 1),
          symbol,
          tick.quote,
          targetTime,
          input.settlementToleranceSeconds,
          input.flatEpsilon,
        );
        settled.push({
          time: tick.eventTime,
          signal: vote.signal,
          strategyId: runner.strategyId,
          runnerId: runner.runnerId,
          instrument: symbol,
          expirySeconds: runner.expirySeconds,
          presetVersion: runner.presetVersion,
          featureHash: snapshot?.hash ?? "none",
          quality: vote.quality,
          proposalKey,
          proposalId,
          proposalReceivedAt,
          proposalAgeMs,
          askPrice,
          payout,
          effectivePayout,
          breakEven,
          reason: vote.reason,
          economicsPolicy: input.economics.version,
          configHash: input.configHash,
          datasetPassportHash: input.datasetPassportHash ?? input.datasetHash,
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
  }
  settled.sort((a, b) => a.time - b.time || (a.runnerId < b.runnerId ? -1 : 1));
  const passportHash = input.datasetPassportHash ?? input.datasetHash;
  const decisionsHash = digestReplayDecisions(settled, {
    economics: input.economics,
    configHash: input.configHash,
    datasetPassportHash: passportHash,
    featureVersion: input.featureVersion,
    codeVersion: input.codeVersion,
    seed: input.seed,
  });
  const versions: Record<string, string> = {};
  const presetVersions: Record<string, string> = {};
  for (const runner of orderedRunners) {
    versions[runner.strategyId] = runner.strategyVersion;
    presetVersions[runner.runnerId] = runner.presetVersion;
  }
  return {
    decisions: settled,
    manifest: {
      mode: input.mode,
      codeVersion: input.codeVersion,
      datasetHash: input.datasetHash,
      datasetPassportHash: passportHash,
      featureVersion: input.featureVersion,
      strategyVersions: versions,
      presetVersions,
      configHash: input.configHash,
      economicsPolicy: input.economics.version,
      proposalTtlMs: input.economics.proposalTtlMs,
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
  if (signal === "NO_SIGNAL" || label === "UNKNOWN") return null;
  if (label === "FLAT") return 0;
  if (effectivePayout === null) return null;
  const won =
    (signal === "SIGNAL_CALL" && label === "UP") || (signal === "SIGNAL_PUT" && label === "DOWN");
  return won ? effectivePayout : -1;
}

function directionalPoints(
  signal: ReplayDecision["signal"],
  label: OutcomeLabel,
): number | null {
  if (signal === "NO_SIGNAL" || label === "UNKNOWN" || label === "FLAT") return null;
  const won =
    (signal === "SIGNAL_CALL" && label === "UP") || (signal === "SIGNAL_PUT" && label === "DOWN");
  return won ? 1 : -1;
}
