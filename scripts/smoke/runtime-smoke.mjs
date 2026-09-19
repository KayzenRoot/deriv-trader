#!/usr/bin/env node
// Assembled-runtime live smoke (DT-WP-02 CORRECTION 001 §14).
// Drives the ACTUAL MarketScannerRuntime against the public Options WS:
// connect -> universe -> capability probe -> shared ticks -> pulse cycle ->
// lattice. Credential-free, tightly bounded, never part of normal CI.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import { loadConfig } from "@deriv-trader/config";
import {
  ApiBudgetManager,
  DerivPublicMarketSource,
  PublicWsClient,
} from "@deriv-trader/deriv-adapter";
// Trader is an app, not a library: reach the built runtime by relative path.
import { MarketScannerRuntime } from "../../apps/trader/dist/runtime.js";

const OVERALL_TIMEOUT_MS = 90_000;
const TICK_WAIT_MS = 15_000;

const timer = setTimeout(() => {
  console.log(JSON.stringify({ status: "BLOCKED", reason: "overall-timeout" }, null, 2));
  process.exit(2);
}, OVERALL_TIMEOUT_MS);
timer.unref?.();

function fail(reason, detail = {}) {
  clearTimeout(timer);
  console.log(JSON.stringify({ status: "BLOCKED", reason, ...detail }, null, 2));
  process.exit(2);
}

const config = loadConfig();
const startedAt = new Date().toISOString();
const budget = new ApiBudgetManager();
const client = new PublicWsClient(config.derivOptionsPublicWsUrl, {
  socketFactory: (url) => new WebSocket(url),
  requestTimeoutMs: 10_000,
  connectionId: "smoke-runtime",
});
const source = new DerivPublicMarketSource(client, budget, { buildSha: "smoke" });
const runtime = new MarketScannerRuntime({
  config,
  source,
  budget,
  transport: {
    client,
    onDisconnect: () => undefined,
  },
  universeCap: 3,
  captureRoot: mkdtempSync(join(tmpdir(), "dt-runtime-smoke-")),
});

try {
  await runtime.connect();
  const state = runtime.supervisor?.getState() ?? "NONE";
  if (state !== "HEALTHY") fail("not-healthy", { state });
  await runtime.refreshUniverse();
  const universe = runtime.registry.symbols();
  if (universe.length === 0) fail("empty-universe", {});
  const first = universe[0].instrument.underlyingSymbol;
  const probes = await runtime.probeExpiries([first]);
  await runtime.ensureTicks([first]);
  const seen = await new Promise((resolve) => {
    const collected = [];
    const timeout = setTimeout(() => resolve(collected), TICK_WAIT_MS);
    timeout.unref?.();
    runtime.hub
      .subscribe(first, (tick) => {
        collected.push({ quote: tick.quote, eventTime: tick.eventTime });
        if (collected.length >= 2) {
          clearTimeout(timeout);
          resolve(collected);
        }
      })
      .catch(() => resolve(collected));
  });
  const quotes = await runtime.scannerCycle();
  const lattice = runtime.lattice();
  const proposal = budget.telemetry("proposal");
  const other = budget.telemetry("other");
  const totalSends = proposal.callsLastMinute + other.callsLastMinute;
  await runtime.stop();
  await client.close();
  clearTimeout(timer);
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        endpoint: config.derivOptionsPublicWsUrl,
        startedAt,
        finishedAt: new Date().toISOString(),
        universe: universe.length,
        firstSymbol: first,
        probes,
        ticksReceived: seen.length,
        pulseQuotes: quotes.length,
        latticeCount: lattice.count,
        latticeEligible: lattice.eligible,
        firstOpportunity: lattice.opportunities[0] ?? null,
        totalSends,
        proposalBudget: proposal,
        bounded: totalSends <= 30,
      },
      null,
      2,
    ),
  );
} catch (error) {
  try {
    await runtime.stop();
  } catch {
    // ignore shutdown errors on the failure path
  }
  try {
    await client.close();
  } catch {
    // ignore
  }
  fail("runtime-error", { detail: String(error) });
}
