import { describe, expect, it, vi } from "vitest";
import { ConnectionSupervisor } from "./supervisor.js";
import { ApiBudgetManager } from "./budget.js";

function makeClock(start = 0): { nowMs: () => number; advance: (ms: number) => void } {
  let now = start;
  return {
    nowMs: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("connection supervisor", () => {
  it("reaches HEALTHY and restores subscriptions exactly once", async () => {
    const restored: string[] = [];
    const invalidated: number[] = [];
    const supervisor = new ConnectionSupervisor({
      connect: () => Promise.resolve(),
      restoreSubscriptions: () => {
        restored.push("tick:R_100");
        return Promise.resolve();
      },
      heartbeat: () => Promise.resolve(true),
      onInvalidate: (epoch: number) => {
        invalidated.push(epoch);
      },
      clock: makeClock(0),
      random: () => 0,
      heartbeatMs: 60_000,
    });
    await supervisor.start();
    expect(supervisor.getState()).toBe("HEALTHY");
    expect(restored).toEqual(["tick:R_100"]);
    expect(supervisor.getEpoch()).toBe(0);
    await supervisor.stop();
    expect(supervisor.getState()).toBe("STOPPED");
  });

  it("invalidates pre-reconnect authority and backs off within bounds", async () => {
    let connects = 0;
    const invalidated: number[] = [];
    const supervisor = new ConnectionSupervisor({
      connect: () => {
        connects += 1;
        return connects === 1 ? Promise.resolve() : Promise.reject(new Error("down"));
      },
      restoreSubscriptions: () => Promise.resolve(),
      heartbeat: () => Promise.resolve(true),
      onInvalidate: (epoch: number) => {
        invalidated.push(epoch);
      },
      clock: makeClock(0),
      random: () => 0,
      baseDelayMs: 100,
      maxDelayMs: 500,
      maxAttempts: 2,
      heartbeatMs: 60_000,
    });
    expect(supervisor.delayForAttempt(0)).toBe(100);
    expect(supervisor.delayForAttempt(10)).toBe(500);
    await supervisor.start();
    expect(supervisor.getState()).toBe("HEALTHY");
    await supervisor.handleConnectionLost("CONNECTION_LOST");
    await vi.waitFor(() => {
      expect(connects).toBeGreaterThan(1);
    });
    expect(invalidated.length).toBeGreaterThan(0);
    expect(supervisor.getEpoch()).toBeGreaterThan(0);
    await supervisor.stop();
  });
});

describe("API budget manager", () => {
  it("throttles scanner traffic before execution reserve", () => {
    const clock = makeClock(0);
    const budget = new ApiBudgetManager(
      {
        proposal: { perMinute: 10, perLong: 100, longWindowMs: 3600_000 },
        proposalReserveFraction: 0.3,
      },
      clock,
    );
    for (let i = 0; i < 7; i += 1) {
      expect(budget.admit("SIGNAL_PROPOSAL").admitted).toBe(true);
    }
    const throttled = budget.admit("SIGNAL_PROPOSAL");
    expect(throttled.admitted).toBe(false);
    expect(throttled.queued).toBe(true);
    expect(budget.admit("CRITICAL_EXECUTION").admitted).toBe(true);
    const telemetry = budget.telemetry("proposal");
    expect(telemetry.queueDepth).toBe(1);
    expect(telemetry.throttledCount).toBe(1);
    expect(telemetry.estimatedRemainingMinute).toBe(2);
  });

  it("backs off on rate limits without retry storms", () => {
    const clock = makeClock(0);
    const budget = new ApiBudgetManager({}, clock);
    budget.recordRateLimited("other");
    const rejected = budget.admit("MARKET_DISCOVERY");
    expect(rejected.admitted).toBe(false);
    expect(budget.telemetry("other").rejectedCount).toBeGreaterThan(0);
    clock.advance(61_000);
    expect(budget.admit("MARKET_DISCOVERY").admitted).toBe(true);
    budget.recordSuccess();
  });
});
