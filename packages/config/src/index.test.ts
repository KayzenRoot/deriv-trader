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

  it("resolves data root deterministically and safely", () => {
    const repoRoot = "/repo";
    expect(resolveDataRoot({ dataRoot: "./data" }, repoRoot)).toBe("/repo/data");
    // Path traversal segments are stripped, never escaping via ../
    expect(resolveDataRoot({ dataRoot: "../outside" }, repoRoot)).toBe("/repo/outside");
    expect(resolveDataRoot({ dataRoot: "/abs/path" }, repoRoot)).toBe("/abs/path");
  });
});
