/**
 * Execution boundary (DT-WP-01 Phase F).
 * Orchestration interfaces only. Explicitly cannot call a real broker yet.
 */
import type { AdmissionReasonCode, RunnerIdentity } from "@deriv-trader/domain";
import type { RiskDecision } from "@deriv-trader/risk";

export interface ExecutionIntent {
  readonly runner: RunnerIdentity;
  readonly symbol: string;
  readonly stake: number;
}

export interface ExecutionOutcome {
  readonly admitted: boolean;
  readonly reason: AdmissionReasonCode;
  readonly risk: RiskDecision;
  readonly message: string;
}

export interface ExecutionOrchestrator {
  admit(intent: ExecutionIntent, risk: RiskDecision): ExecutionOutcome;
}

export class FoundationExecutionOrchestrator implements ExecutionOrchestrator {
  admit(intent: ExecutionIntent, risk: RiskDecision): ExecutionOutcome {
    if (!risk.allowed) {
      return {
        admitted: false,
        reason: "ADMIT_REJECTED_RISK",
        risk,
        message: `rejected for ${intent.symbol}`,
      };
    }
    // Foundation never places broker orders; admission is recorded only.
    return {
      admitted: true,
      reason: "ADMIT_OK",
      risk,
      message: `admitted (no broker call) for ${intent.symbol}`,
    };
  }
}
