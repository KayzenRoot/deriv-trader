/**
 * Payout Pulse Scheduler (DT-WP-02 Phase D).
 * Adaptive proposal refresh across the eligible CALL/PUT universe within
 * broker capability. Priority 0 (execution reserve) is never scheduled here —
 * it is protected structurally via the budget reserve fraction. Discovery can
 * never exhaust the proposal budget: scheduling consults ApiBudgetManager.
 */
import type { Clock, ProposalAssumptions, ProposalQuote } from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

/**
 * Minimal budget port the scheduler needs. Schedulers only PEEK availability;
 * the single admit (charge) happens at the adapter request path, so one
 * broker send always equals one budget charge (F4).
 */
export interface PulseBudget {
  peek(budgetClass: "SIGNAL_PROPOSAL", cost?: number): boolean;
}

export type PulsePriority = 0 | 1 | 2 | 3 | 4;

export interface PulseCandidate {
  readonly assumptions: ProposalAssumptions;
  readonly priority: PulsePriority;
  /** Concrete future signal demand (priority 1) vs background refresh. */
  readonly signalDemand: boolean;
  lastQuoteAtMs: number | null;
  lastEffective: number | null;
}

export interface PulseConfig {
  readonly discoveryIntervalMs: number;
  readonly routineIntervalMs: number;
  readonly nearThresholdIntervalMs: number;
  readonly proposalTtlMs: number;
  readonly nearThresholdDelta: number;
  readonly batchLimit: number;
}

export const DEFAULT_PULSE_CONFIG: PulseConfig = {
  discoveryIntervalMs: 5 * 60_000,
  routineIntervalMs: 60_000,
  nearThresholdIntervalMs: 15_000,
  proposalTtlMs: 30_000,
  nearThresholdDelta: 0.1,
  batchLimit: 10,
};

export class PayoutPulseScheduler {
  private readonly budget: PulseBudget;
  private readonly quote: (assumptions: ProposalAssumptions) => Promise<ProposalQuote>;
  private readonly clock: Clock;
  private readonly config: PulseConfig;
  private readonly threshold: number;

  constructor(
    budget: PulseBudget,
    quote: (assumptions: ProposalAssumptions) => Promise<ProposalQuote>,
    options: { clock?: Clock; config?: Partial<PulseConfig>; threshold?: number } = {},
  ) {
    this.budget = budget;
    this.quote = quote;
    this.clock = options.clock ?? systemClock();
    this.config = { ...DEFAULT_PULSE_CONFIG, ...(options.config ?? {}) };
    this.threshold = options.threshold ?? 0.8;
  }

  /** Is a refresh due for this candidate right now? */
  isDue(candidate: PulseCandidate, now: number = this.clock.nowMs()): boolean {
    if (candidate.priority === 0) return false;
    if (candidate.lastQuoteAtMs === null) return true;
    const age = now - candidate.lastQuoteAtMs;
    if (candidate.signalDemand) return age >= this.config.nearThresholdIntervalMs;
    if (
      candidate.lastEffective !== null &&
      Math.abs(candidate.lastEffective - this.threshold) <= this.config.nearThresholdDelta
    ) {
      return age >= this.config.nearThresholdIntervalMs;
    }
    if (candidate.priority === 4) return age >= this.config.discoveryIntervalMs;
    return age >= this.config.routineIntervalMs;
  }

  order(candidates: PulseCandidate[]): PulseCandidate[] {
    const now = this.clock.nowMs();
    return [...candidates]
      .filter((c) => c.priority !== 0 && this.isDue(c, now))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (a.lastQuoteAtMs ?? 0) - (b.lastQuoteAtMs ?? 0);
      })
      .slice(0, this.config.batchLimit);
  }

  /** Refresh due candidates while the proposal budget has headroom (peek only). */
  async refresh(candidates: PulseCandidate[]): Promise<ProposalQuote[]> {
    const results: ProposalQuote[] = [];
    for (const candidate of this.order(candidates)) {
      if (!this.budget.peek("SIGNAL_PROPOSAL")) break;
      const quote = await this.quote(candidate.assumptions);
      candidate.lastQuoteAtMs = this.clock.nowMs();
      candidate.lastEffective = quote.effectivePayout;
      results.push(quote);
    }
    return results;
  }
}
