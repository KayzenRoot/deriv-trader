import { describe, expect, it } from "vitest";
import { NoSignalStrategyEngine } from "./index.js";
import { makeRunnerIdentity } from "@deriv-trader/testing";

describe("strategies foundation", () => {
  it("returns NO_SIGNAL by default (no fabricated edge)", () => {
    const engine = new NoSignalStrategyEngine();
    const decision = engine.decide({
      runner: makeRunnerIdentity(),
      symbol: "R_100",
      now: new Date().toISOString(),
    });
    expect(decision.signal).toBe("NO_SIGNAL");
    expect(decision.expirySeconds).toBe(60);
  });
});
