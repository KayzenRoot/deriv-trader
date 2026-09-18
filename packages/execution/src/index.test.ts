import { describe, expect, it } from "vitest";
import { FoundationExecutionOrchestrator } from "./index.js";
import { makeRunnerIdentity } from "@deriv-trader/testing";

describe("execution foundation", () => {
  it("rejects when risk blocks (never calls broker)", () => {
    const orchestrator = new FoundationExecutionOrchestrator();
    const outcome = orchestrator.admit(
      { runner: makeRunnerIdentity(), symbol: "R_100", stake: 1 },
      { allowed: false, reason: "RISK_BLOCKED_SLOT_FULL", message: "full" },
    );
    expect(outcome.admitted).toBe(false);
    expect(outcome.reason).toBe("ADMIT_REJECTED_RISK");
  });

  it("admits without broker side effects when risk allows", () => {
    const orchestrator = new FoundationExecutionOrchestrator();
    const outcome = orchestrator.admit(
      { runner: makeRunnerIdentity(), symbol: "R_100", stake: 1 },
      { allowed: true, reason: "RISK_OK", message: "ok" },
    );
    expect(outcome.admitted).toBe(true);
    expect(outcome.message).toContain("no broker call");
  });
});
