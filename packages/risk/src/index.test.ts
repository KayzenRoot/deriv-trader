import { describe, expect, it } from "vitest";
import { FoundationRiskGate } from "./index.js";
import { makeRunnerIdentity } from "@deriv-trader/testing";

describe("risk foundation", () => {
  it("blocks non-positive stake", () => {
    const gate = new FoundationRiskGate();
    const decision = gate.evaluate({
      runner: makeRunnerIdentity(),
      symbol: "R_100",
      stake: 0,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("RISK_BLOCKED_EXPOSURE");
  });

  it("admits positive stake at foundation level", () => {
    const gate = new FoundationRiskGate();
    const decision = gate.evaluate({
      runner: makeRunnerIdentity(),
      symbol: "R_100",
      stake: 1,
    });
    expect(decision.allowed).toBe(true);
  });
});
