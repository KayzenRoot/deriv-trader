#!/usr/bin/env node
/* eslint-disable no-console -- dt-research is an operator CLI: stdout output is its purpose, never the trading path. */
/**
 * dt-research CLI (DT-WP-03 §20).
 * inspect | replay | matrix | sensitivity | portfolio
 * Deterministic, seeded, offline. Large outputs stay local/gitignored.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateProposals, generateTicks, type SyntheticRegime } from "./dataset.js";
import { runLab, type LabDataset } from "./lab.js";
import { runReplay } from "./replay.js";
import { makeEngine, toReplayRunner } from "./lab.js";
import { seedPreset, ALL_PROFILES } from "@deriv-trader/strategies";
import { orderSignals, simulate, toSimulatorSignals, SIMULATOR_POLICY_VERSION } from "./simulator.js";

const OUT_ROOT = join(process.cwd(), "data", "research");

function outDir(name: string): string {
  const dir = join(OUT_ROOT, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function fixtureDataset(seed: number): LabDataset {
  const regimes: SyntheticRegime[] = ["trend_up", "range", "trend_down", "range", "breakout_up", "micro_burst"];
  const ticks = [
    ...generateTicks({ symbol: "SYNTH_A", startEpoch: 1_700_000_000, ticks: 900, basePrice: 1.085, seed, regimes }),
    ...generateTicks({ symbol: "SYNTH_B", startEpoch: 1_700_000_000, ticks: 900, basePrice: 500, seed: seed + 1, regimes }),
  ];
  const proposals = generateProposals({
    symbols: ["SYNTH_A", "SYNTH_B"],
    expiries: [60, 180, 300],
    effectivePayout: 0.9,
    startEpoch: 1_700_000_000,
    everyTicks: 30,
  });
  return { ticks, proposals, datasetHash: `synth-${String(seed)}`, grade: "synthetic" };
}

function usage(): void {
  console.log("dt-research <inspect|replay|matrix|sensitivity|portfolio> [--seed N]");
}

function main(): void {
  const [command = "", seedFlag = "", seedValue = ""] = process.argv.slice(2);
  const seed = seedFlag === "--seed" && seedValue ? Number(seedValue) || 42 : 42;
  if (command === "inspect") {
    const dataset = fixtureDataset(seed);
    const dir = outDir("inspect");
    const summary = {
      ticks: dataset.ticks.length,
      proposals: dataset.proposals.length,
      symbols: [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))],
      timeRange: [
        Math.min(...dataset.ticks.map((t) => t.eventTime)),
        Math.max(...dataset.ticks.map((t) => t.eventTime)),
      ],
      grade: dataset.grade,
    };
    writeFileSync(join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (command === "replay") {
    const dataset = fixtureDataset(seed);
    const profile = ALL_PROFILES[0];
    if (!profile) throw new Error("no profiles");
    const engine = makeEngine(profile.strategy, seedPreset(profile.strategy));
    const output = runReplay({
      mode: "proposal-aware",
      ticks: dataset.ticks.filter((t) => t.underlyingSymbol === "SYNTH_A"),
      proposals: dataset.proposals,
      runners: [toReplayRunner(engine, profile, "SYNTH_A", "seed-1")],
      fromTime: 1_700_000_000,
      toTime: 1_700_000_899,
      stepTicks: 5,
      settlementToleranceSeconds: 10,
      flatEpsilon: 0,
      proposalAmount: 10,
      proposalCurrency: "USD",
      proposalBasis: "stake",
      codeVersion: "wp03-cli-1",
      datasetHash: dataset.datasetHash,
      featureVersion: "sfg-1",
      configHash: "cli-default",
      seed,
    });
    const dir = outDir("replay");
    writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(output.manifest, null, 2)}\n`);
    console.log(`decisions=${String(output.decisions.length)} hash=${output.manifest.decisionsHash}`);
    return;
  }
  if (command === "matrix") {
    const dataset = fixtureDataset(seed);
    const run = runLab(dataset, { seed, codeVersion: "wp03-cli-1", configHash: "cli-default" });
    const dir = outDir("matrix");
    const summary = run.verdicts.map((v) => ({
      profile: `${v.profile.strategy}_${String(v.profile.expirySeconds)}s`,
      state: v.state,
      reason: v.reason,
      oosSignals: v.oosSignals,
      oosExpectancy: v.oosExpectancy,
    }));
    writeFileSync(join(dir, "matrix.json"), `${JSON.stringify(summary, null, 2)}\n`);
    const enabled = summary.filter((s) => s.state === "ENABLED");
    console.log(`profiles=${String(summary.length)} enabled=${String(enabled.length)}`);
    for (const row of summary) console.log(`${row.profile}: ${row.state} (${row.reason})`);
    if (enabled.length > 0) throw new Error("WP-03 must never mark profiles ENABLED");
    return;
  }
  if (command === "sensitivity") {
    const dataset = fixtureDataset(seed);
    const run = runLab(dataset, { seed, codeVersion: "wp03-cli-1", configHash: "cli-default" });
    const dir = outDir("sensitivity");
    const rows = run.verdicts.map((v) => ({
      profile: `${v.profile.strategy}_${String(v.profile.expirySeconds)}s`,
      sensitivityStable: v.sensitivityStable,
      variantsTried: v.variantsTried,
    }));
    writeFileSync(join(dir, "sensitivity.json"), `${JSON.stringify(rows, null, 2)}\n`);
    console.log(`stable=${String(rows.filter((r) => r.sensitivityStable).length)}/${String(rows.length)}`);
    return;
  }
  if (command === "portfolio") {
    const dataset = fixtureDataset(seed);
    const runners = ALL_PROFILES.slice(0, 3).map((profile) => {
      const engine = makeEngine(profile.strategy, seedPreset(profile.strategy));
      return toReplayRunner(engine, profile, "SYNTH_A", "seed-1");
    });
    const output = runReplay({
      mode: "proposal-aware",
      ticks: dataset.ticks.filter((t) => t.underlyingSymbol === "SYNTH_A"),
      proposals: dataset.proposals,
      runners,
      fromTime: 1_700_000_000,
      toTime: 1_700_000_899,
      stepTicks: 5,
      settlementToleranceSeconds: 10,
      flatEpsilon: 0,
      proposalAmount: 10,
      proposalCurrency: "USD",
      proposalBasis: "stake",
      codeVersion: "wp03-cli-1",
      datasetHash: dataset.datasetHash,
      featureVersion: "sfg-1",
      configHash: "cli-default",
      seed,
    });
    const ordered = orderSignals(toSimulatorSignals(output.decisions));
    const metrics = simulate(ordered, {
      version: SIMULATOR_POLICY_VERSION,
      maxSimultaneous: 3,
      maxPerInstrument: 2,
      cooldownSeconds: 120,
      dailyStopLoss: 10,
      dailyTarget: null,
      fixedStake: 1,
    });
    const dir = outDir("portfolio");
    writeFileSync(join(dir, "portfolio.json"), `${JSON.stringify(metrics, null, 2)}\n`);
    console.log(`fills=${String(metrics.fills)} pnl=${metrics.portfolioPnl.toFixed(3)} slotsBlocked=${String(metrics.blockedSlot)}`);
    return;
  }
  usage();
  process.exit(2);
}

try {
  main();
} catch (error: unknown) {
  console.error(`dt-research failed: ${String(error)}`);
  process.exit(1);
}
