/**
 * Strategies boundary (DT-WP-01 Phase F).
 * Exposes StrategyEngine/Runner contracts with no fabricated profitable logic.
 * Strategies must never import broker buy/order implementation.
 */
import type {
  DecisionSignal,
  ExpirySeconds,
  RunnerIdentity,
} from "@deriv-trader/domain";

export interface StrategyContext {
  readonly runner: RunnerIdentity;
  readonly symbol: string;
  readonly now: string;
}

export interface StrategyDecision {
  readonly signal: DecisionSignal;
  readonly reason: string;
  readonly expirySeconds: ExpirySeconds;
}

/**
 * Minimal engine contract. The foundation implementation always returns
 * NO_SIGNAL so later work packages can plug real research-backed engines.
 */
export interface StrategyEngine {
  readonly strategyId: string;
  decide(context: StrategyContext): StrategyDecision;
}

export class NoSignalStrategyEngine implements StrategyEngine {
  readonly strategyId = "foundation_no_signal";
  decide(context: StrategyContext): StrategyDecision {
    return {
      signal: "NO_SIGNAL",
      reason: `foundation skeleton for ${context.runner.strategyId}`,
      expirySeconds: context.runner.expirySeconds,
    };
  }
}
