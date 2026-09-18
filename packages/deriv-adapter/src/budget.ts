/**
 * API Budget Manager (DT-WP-02 Phase B).
 * Configurable minute/hour windows per documented request group, priority
 * admission with a preserved proposal reserve for future execution, bounded
 * FIFO queueing, rate-limit backoff and full telemetry. No limit evasion:
 * budgets only throttle/reject locally, never spread load across IPs/accounts.
 */
import type { Clock } from "@deriv-trader/domain";
import { systemClock } from "@deriv-trader/domain";

export type BudgetGroup = "proposal" | "other" | "rest";

export type BudgetClass =
  | "CRITICAL_EXECUTION"
  | "RECONCILIATION"
  | "SIGNAL_PROPOSAL"
  | "MARKET_DISCOVERY"
  | "REPORTING"
  | "BACKGROUND";

const CLASS_GROUP: Record<BudgetClass, BudgetGroup> = {
  CRITICAL_EXECUTION: "proposal",
  RECONCILIATION: "proposal",
  SIGNAL_PROPOSAL: "proposal",
  MARKET_DISCOVERY: "other",
  REPORTING: "other",
  BACKGROUND: "other",
};

/** Lower number = higher priority (throttled last). */
const CLASS_PRIORITY: Record<BudgetClass, number> = {
  CRITICAL_EXECUTION: 0,
  RECONCILIATION: 1,
  SIGNAL_PROPOSAL: 2,
  MARKET_DISCOVERY: 3,
  REPORTING: 4,
  BACKGROUND: 5,
};

export interface BudgetWindow {
  readonly perMinute: number;
  readonly perHour: number;
}

export interface BudgetConfig {
  readonly version: string;
  readonly proposal: BudgetWindow;
  readonly other: BudgetWindow;
  readonly rest: BudgetWindow;
  /** Share of the proposal minute budget preserved for future execution. */
  readonly proposalReserveFraction: number;
  readonly maxQueueDepth: number;
}

/** Documented Deriv defaults at DT-WP-02 compile time (configurable). */
export const BUDGET_DEFAULTS_VERSION = "2026-09-18";

export const DEFAULT_BUDGET: BudgetConfig = {
  version: BUDGET_DEFAULTS_VERSION,
  proposal: { perMinute: 360, perHour: 14400 },
  other: { perMinute: 220, perHour: 14400 },
  rest: { perMinute: 300, perHour: 10000 },
  proposalReserveFraction: 0.3,
  maxQueueDepth: 100,
};

export interface AdmitResult {
  readonly admitted: boolean;
  readonly throttled: boolean;
  readonly queued: boolean;
  readonly reason: string;
}

export interface BudgetTelemetry {
  readonly group: BudgetGroup;
  readonly callsLastMinute: number;
  readonly callsLastHour: number;
  readonly estimatedRemainingMinute: number;
  readonly estimatedRemainingHour: number;
  readonly throttledCount: number;
  readonly rejectedCount: number;
  readonly queueDepth: number;
  readonly oldestQueuedAgeMs: number | null;
  readonly backoffUntilMs: number | null;
  readonly reconnectCount: number;
}

interface QueuedItem {
  readonly enqueuedAt: number;
  readonly budgetClass: BudgetClass;
}

export class ApiBudgetManager {
  private readonly config: BudgetConfig;
  private readonly clock: Clock;
  private readonly calls = new Map<BudgetGroup, number[]>();
  private readonly throttledCount = new Map<BudgetGroup, number>();
  private readonly rejectedCount = new Map<BudgetGroup, number>();
  private readonly queues = new Map<BudgetGroup, QueuedItem[]>();
  private readonly backoffUntil = new Map<BudgetGroup, number>();
  private backoffLevel = 0;
  private reconnects = 0;

  constructor(config: Partial<BudgetConfig> = {}, clock?: Clock) {
    this.config = { ...DEFAULT_BUDGET, ...config };
    this.clock = clock ?? systemClock();
    for (const group of ["proposal", "other", "rest"] as const) {
      this.calls.set(group, []);
      this.throttledCount.set(group, 0);
      this.rejectedCount.set(group, 0);
      this.queues.set(group, []);
    }
  }

  getConfig(): BudgetConfig {
    return this.config;
  }

  recordReconnect(): void {
    this.reconnects += 1;
  }

  /** Bounded backoff after a broker rate-limit rejection (no retry storm). */
  recordRateLimited(group: BudgetGroup): void {
    this.backoffLevel = Math.min(this.backoffLevel + 1, 6);
    const delay = Math.min(1000 * 2 ** this.backoffLevel, 60000);
    this.backoffUntil.set(group, this.clock.nowMs() + delay);
    this.rejectedCount.set(group, (this.rejectedCount.get(group) ?? 0) + 1);
  }

  recordSuccess(): void {
    this.backoffLevel = 0;
  }

  private prune(group: BudgetGroup, now: number): number[] {
    const hourAgo = now - 3600_000;
    const kept = (this.calls.get(group) ?? []).filter((t) => t > hourAgo);
    this.calls.set(group, kept);
    return kept;
  }

  private countSince(calls: number[], sinceMs: number): number {
    let count = 0;
    for (const t of calls) if (t >= sinceMs) count += 1;
    return count;
  }

  admit(budgetClass: BudgetClass, cost = 1): AdmitResult {
    const group = CLASS_GROUP[budgetClass];
    const window = this.config[group];
    const now = this.clock.nowMs();
    const backoffUntil = this.backoffUntil.get(group) ?? null;
    if (backoffUntil !== null && now < backoffUntil) {
      this.rejectedCount.set(group, (this.rejectedCount.get(group) ?? 0) + cost);
      return {
        admitted: false,
        throttled: true,
        queued: false,
        reason: `backoff until ${String(backoffUntil)}`,
      };
    }
    const calls = this.prune(group, now);
    const lastMinute = this.countSince(calls, now - 60_000);
    const lastHour = calls.length;
    let ceiling = window.perMinute;
    // Proposal reserve: scanner-class traffic stops early so future
    // execution/reconciliation keeps headroom.
    if (group === "proposal" && CLASS_PRIORITY[budgetClass] >= CLASS_PRIORITY.SIGNAL_PROPOSAL) {
      ceiling = Math.floor(window.perMinute * (1 - this.config.proposalReserveFraction));
    }
    if (lastMinute + cost > ceiling || lastHour + cost > window.perHour) {
      const queue = this.queues.get(group) ?? [];
      if (queue.length < this.config.maxQueueDepth) {
        queue.push({ enqueuedAt: now, budgetClass });
        this.queues.set(group, queue);
        this.throttledCount.set(group, (this.throttledCount.get(group) ?? 0) + cost);
        return { admitted: false, throttled: true, queued: true, reason: "budget exhausted; queued" };
      }
      this.rejectedCount.set(group, (this.rejectedCount.get(group) ?? 0) + cost);
      return { admitted: false, throttled: true, queued: false, reason: "budget exhausted; queue full" };
    }
    for (let i = 0; i < cost; i += 1) calls.push(now);
    this.calls.set(group, calls);
    return { admitted: true, throttled: false, queued: false, reason: "admitted" };
  }

  /** Drain one queued item per group when budget allows (FIFO). */
  drain(): { group: BudgetGroup; budgetClass: BudgetClass }[] {
    const released: { group: BudgetGroup; budgetClass: BudgetClass }[] = [];
    const now = this.clock.nowMs();
    for (const group of ["proposal", "other", "rest"] as const) {
      const queue = this.queues.get(group) ?? [];
      const head = queue[0];
      if (!head) continue;
      const backoffUntil = this.backoffUntil.get(group) ?? null;
      if (backoffUntil !== null && now < backoffUntil) continue;
      const calls = this.prune(group, now);
      const window = this.config[group];
      if (this.countSince(calls, now - 60_000) + 1 > window.perMinute) continue;
      if (calls.length + 1 > window.perHour) continue;
      queue.shift();
      calls.push(now);
      this.calls.set(group, calls);
      released.push({ group, budgetClass: head.budgetClass });
    }
    return released;
  }

  telemetry(group: BudgetGroup): BudgetTelemetry {
    const now = this.clock.nowMs();
    const calls = this.prune(group, now);
    const window = this.config[group];
    const queue = this.queues.get(group) ?? [];
    const oldest = queue[0]?.enqueuedAt ?? null;
    return {
      group,
      callsLastMinute: this.countSince(calls, now - 60_000),
      callsLastHour: calls.length,
      estimatedRemainingMinute: Math.max(0, window.perMinute - this.countSince(calls, now - 60_000)),
      estimatedRemainingHour: Math.max(0, window.perHour - calls.length),
      throttledCount: this.throttledCount.get(group) ?? 0,
      rejectedCount: this.rejectedCount.get(group) ?? 0,
      queueDepth: queue.length,
      oldestQueuedAgeMs: oldest === null ? null : now - oldest,
      backoffUntilMs: this.backoffUntil.get(group) ?? null,
      reconnectCount: this.reconnects,
    };
  }
}
