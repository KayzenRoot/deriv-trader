/**
 * Shared test utilities and fixtures (DT-WP-01 Phase F).
 * No production side effects; deterministic helpers only.
 */
import type { RunnerIdentity, StrategyId, ExecutionProfileId } from "@deriv-trader/domain";

export function makeRunnerIdentity(overrides?: Partial<RunnerIdentity>): RunnerIdentity {
  return {
    strategyId: "strategy_demo_trend" as StrategyId,
    expirySeconds: 60,
    executionProfile: "profile_demo" as ExecutionProfileId,
    ...overrides,
  };
}

export function fixedDate(iso = "2026-09-18T00:00:00.000Z"): Date {
  return new Date(iso);
}

export function uniqueTestId(prefix = "test"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
