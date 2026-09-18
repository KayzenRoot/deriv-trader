import { describe, expect, it } from "vitest";
import { loadConfig, resolveDataRoot, isLoopbackHost } from "./index.js";

describe("config", () => {
  it("loads safe defaults without real credentials", () => {
    const config = loadConfig({});
    expect(config.environment).toBe("DEMO");
    expect(config.traderHost).toBe("127.0.0.1");
    expect(config.supabaseUrl).toBe("");
    expect(isLoopbackHost(config.traderHost)).toBe(true);
  });

  it("defaults to the current Options API public surfaces (no legacy endpoint)", () => {
    const config = loadConfig({});
    expect(config.derivOptionsRestBaseUrl).toBe("https://api.derivws.com");
    expect(config.derivOptionsPublicWsUrl).toBe(
      "wss://api.derivws.com/trading/v1/options/ws/public",
    );
    expect(config.derivOptionsPublicWsUrl).not.toContain("websockets/v3");
    expect(config.derivOptionsPublicWsUrl).not.toBe("wss://ws.derivws.com/websockets/v3");
  });

  it("resolves data root deterministically and safely", () => {
    const repoRoot = "/repo";
    expect(resolveDataRoot({ dataRoot: "./data" }, repoRoot)).toBe("/repo/data");
    // Path traversal segments are stripped, never escaping via ../
    expect(resolveDataRoot({ dataRoot: "../outside" }, repoRoot)).toBe("/repo/outside");
    expect(resolveDataRoot({ dataRoot: "/abs/path" }, repoRoot)).toBe("/abs/path");
  });
});
