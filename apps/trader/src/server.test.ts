import { describe, expect, it } from "vitest";
import { createTraderService, assertLoopback } from "./server.js";
import { loadConfig } from "@deriv-trader/config";

describe("trader worker", () => {
  it("defaults to loopback binding", () => {
    const config = loadConfig({});
    expect(config.traderHost).toBe("127.0.0.1");
    expect(() => {
      assertLoopback(config.traderHost);
    }).not.toThrow();
    expect(() => {
      assertLoopback("0.0.0.0");
    }).toThrow();
  });

  it("exposes versioned health without secrets", async () => {
    const service = createTraderService({ config: loadConfig({}) });
    const health = await service.app.inject({ method: "GET", url: "/v1/health" });
    expect(health.statusCode).toBe(200);
    const body: unknown = health.json();
    expect(body).toMatchObject({ environment: "DEMO" });
    expect(JSON.stringify(body)).not.toContain("PAT");
    await service.close();
    expect(service.getState()).toBe("STOPPED");
  });

  it("creates shutdown-safe services repeatedly", async () => {
    const first = createTraderService({ config: loadConfig({}) });
    await first.close();
    const second = createTraderService({ config: loadConfig({}) });
    const status = await second.app.inject({ method: "GET", url: "/v1/status" });
    expect(status.statusCode).toBe(200);
    await second.close();
  });
});
