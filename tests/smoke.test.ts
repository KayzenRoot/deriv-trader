/**
 * Foundation smoke test (DT-WP-01 Phase H).
 * Proves package imports and the build graph resolve together.
 */
import { describe, expect, it } from "vitest";

import * as domain from "@deriv-trader/domain";
import * as config from "@deriv-trader/config";
import * as events from "@deriv-trader/events";
import * as auth from "@deriv-trader/auth";
import * as connections from "@deriv-trader/connections";
import * as secretStore from "@deriv-trader/secret-store";
import * as derivAdapter from "@deriv-trader/deriv-adapter";
import * as marketData from "@deriv-trader/market-data";
import * as scanner from "@deriv-trader/scanner";
import * as strategies from "@deriv-trader/strategies";
import * as risk from "@deriv-trader/risk";
import * as execution from "@deriv-trader/execution";
import * as db from "@deriv-trader/db";
import * as research from "@deriv-trader/research";
import * as reporting from "@deriv-trader/reporting";
import * as testing from "@deriv-trader/testing";

describe("foundation import graph", () => {
  it("resolves every package boundary", () => {
    expect(domain.EXPIRY_SECONDS).toBeDefined();
    expect(config.loadConfig).toBeTypeOf("function");
    expect(events.createEvent).toBeTypeOf("function");
    expect(auth.createAuthClient).toBeTypeOf("function");
    expect(connections.describeConnection).toBeTypeOf("function");
    expect(secretStore.InMemorySecretStore).toBeTypeOf("function");
    expect(derivAdapter.NullDerivAdapter).toBeTypeOf("function");
    expect(marketData).toBeDefined();
    expect(scanner.ineligible).toBeTypeOf("function");
    expect(strategies.NoSignalStrategyEngine).toBeTypeOf("function");
    expect(risk.FoundationRiskGate).toBeTypeOf("function");
    expect(execution.FoundationExecutionOrchestrator).toBeTypeOf("function");
    expect(db.MemoryDbClient).toBeTypeOf("function");
    expect(research.summarizeDataset).toBeTypeOf("function");
    expect(reporting.foundationReport).toBeTypeOf("function");
    expect(testing.makeRunnerIdentity).toBeTypeOf("function");
  });

  it("keeps research side-effect-free (pure data helper)", () => {
    const meta = research.summarizeDataset([
      { symbol: "R_100" },
      { symbol: "R_100" },
      { symbol: "1HZ100V" },
    ]);
    expect(meta.rows).toBe(3);
    expect(meta.symbols).toEqual(["1HZ100V", "R_100"]);
    const report = reporting.foundationReport("test-sha");
    expect(report.environment).toBe("DEMO");
  });
});
