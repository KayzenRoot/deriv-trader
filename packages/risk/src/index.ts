/**
 * Risk boundary (DT-WP-01 Phase F).
 * Gate interfaces and decision types. The full risk engine is not claimed here.
 */
import type { RiskReasonCode, RunnerIdentity } from "@deriv-trader/domain";

export interface RiskRequest {
  readonly runner: RunnerIdentity;
  readonly symbol: string;
  readonly stake: number;
}

export interface RiskDecision {
  readonly allowed: boolean;
  readonly reason: RiskReasonCode;
  readonly message: string;
}

export interface RiskGate {
  evaluate(request: RiskRequest): RiskDecision;
}

/** Foundation gate: closed when stake is non-positive, open otherwise. */
export class FoundationRiskGate implements RiskGate {
  evaluate(request: RiskRequest): RiskDecision {
    if (!(request.stake > 0)) {
      return {
        allowed: false,
        reason: "RISK_BLOCKED_EXPOSURE",
        message: "stake must be positive",
      };
    }
    return { allowed: true, reason: "RISK_OK", message: "foundation admission" };
  }
}
