import { describe, expect, it } from "vitest";
import { loadConfig } from "@deriv-trader/config";
import { createTraderService } from "./server.js";

describe("trader market/scanner/data endpoints", () => {
  it("boots offline with safe read-only snapshots and no secrets", async () => {
    const service = createTraderService({ config: loadConfig({}) });
    for (const url of ["/v1/market/status", "/v1/scanner/status", "/v1/data/status"]) {
      const response = await service.app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(200);
      expect(JSON.stringify(response.json())).not.toMatch(/token|secret|pat/i);
    }
    const marketRes = await service.app.inject({ method: "GET", url: "/v1/market/status" });
    const market: unknown = marketRes.json();
    expect(market).toMatchObject({ connection: { state: "DISCONNECTED" }, symbolsTotal: 0 });
    const scannerRes = await service.app.inject({ method: "GET", url: "/v1/scanner/status" });
    const scanner: unknown = scannerRes.json();
    expect(scanner).toMatchObject({ threshold: 0.8, reserveFraction: 0.3 });
    const opportunitiesRes = await service.app.inject({ method: "GET", url: "/v1/scanner/opportunities" });
    const opportunities: unknown = opportunitiesRes.json();
    expect(opportunities).toMatchObject({ count: 0, eligible: 0, opportunities: [] });
    await service.close();
  });
});
