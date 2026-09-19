#!/usr/bin/env node
/* eslint-disable no-console -- dt-research is an operator CLI: stdout output is its purpose, never the trading path. */
/**
 * dt-research CLI (DT-WP-03 §20).
 * inspect | replay | matrix | sensitivity | portfolio
 * Deterministic, seeded, offline. Large outputs stay local/gitignored.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { proposalKey, type MarketTick, type ProposalQuote } from "@deriv-trader/domain";
import { generateProposals, generateTicks, type SyntheticRegime } from "./dataset.js";
import { admitResearchDataset, runLab, type LabDataset } from "./lab.js";
import { DEFAULT_PROPOSAL_TTL_MS, REPLAY_ECONOMICS_VERSION, runReplay } from "./replay.js";
import { makeEngine, toReplayRunner } from "./lab.js";
import { seedPreset, ALL_PROFILES } from "@deriv-trader/strategies";
import { orderSignals, simulate, toSimulatorSignals, SIMULATOR_POLICY_VERSION } from "./simulator.js";
import { fileSha256 } from "./passport.js";
import { openMemory, readParquetProposals, readParquetTicks } from "./parquet.js";

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

function cliEconomics(): {
  readonly version: string;
  readonly proposalTtlMs: number;
  readonly amount: number;
  readonly currency: string;
  readonly basis: string;
} {
  return {
    version: REPLAY_ECONOMICS_VERSION,
    proposalTtlMs: DEFAULT_PROPOSAL_TTL_MS,
    amount: 10,
    currency: "USD",
    basis: "stake",
  };
}

function usage(): void {
  console.log("dt-research <inspect|replay|matrix|sensitivity|portfolio> [--seed N] [--dataset synth|quant-fixture] [--dataset-path PATH --passport PATH --dataset-id ID]");
}

interface CliArgs {
  readonly command: string;
  readonly seed: number;
  readonly dataset: string;
  readonly datasetPath: string | null;
  readonly passportPath: string | null;
  readonly datasetId: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  let command = "";
  let seed = 42;
  let dataset = "synth";
  let datasetPath: string | null = null;
  let passportPath: string | null = null;
  let datasetId: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--seed") {
      seed = Number(argv[i + 1]) || 42;
      i += 1;
    } else if (arg === "--dataset") {
      dataset = argv[i + 1] ?? "synth";
      i += 1;
    } else if (arg === "--dataset-path") {
      datasetPath = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--passport") {
      passportPath = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--dataset-id") {
      datasetId = argv[i + 1] ?? null;
      i += 1;
    } else if (!arg.startsWith("--") && command === "") {
      command = arg;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { command, seed, dataset, datasetPath, passportPath, datasetId };
}

/**
 * Committed deterministic fixture (F13/CLI --dataset): the same quant-v1
 * ticks/proposals the test suite replays. Resolved from the repo root so
 * `dt-research` runs from the workspace root.
 */
function committedDataset(): LabDataset {
  const dir = join(process.cwd(), "packages", "research", "fixtures", "quant-v1");
  const ticks = JSON.parse(readFileSync(join(dir, "ticks.json"), "utf8")) as MarketTick[];
  const proposals = JSON.parse(readFileSync(join(dir, "proposals.json"), "utf8")) as ProposalQuote[];
  return { ticks, proposals, datasetHash: "quant-fixture-v1", grade: "synthetic" };
}

function parquetFiles(root: string): string[] {
  const stat = statSync(root);
  if (stat.isFile()) return [root];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...parquetFiles(path));
    else if (path.toLowerCase().endsWith(".parquet")) files.push(path);
  }
  return files.sort();
}

async function loadParquetDataset(datasetPath: string, passportPath: string, datasetId: string | null): Promise<LabDataset> {
  const passport = JSON.parse(readFileSync(passportPath, "utf8")) as Parameters<typeof admitResearchDataset>[0]["passport"];
  if (datasetId !== null && passport.datasetId !== datasetId) throw new Error(`Passport dataset id mismatch: ${passport.datasetId}`);
  const files = parquetFiles(datasetPath);
  const { instance, connection } = await openMemory();
  try {
    const tickFiles = files.filter((file) => /tick/i.test(file));
    const proposalFiles = files.filter((file) => /proposal/i.test(file));
    const tickRows = (await Promise.all(tickFiles.map((file) => readParquetTicks(connection, file)))).flat();
    const proposalRows = (await Promise.all(proposalFiles.map((file) => readParquetProposals(connection, file)))).flat();
    const ticks: MarketTick[] = tickRows.map((row) => ({
      underlyingSymbol: row.underlyingSymbol,
      eventTime: row.eventTime,
      receiveTime: row.receiveTime,
      quote: row.quote,
      pipSize: row.pipSize ?? 0,
      sourceConnectionId: row.sourceConnectionId,
      reqId: null,
      subscriptionId: null,
      sequence: row.sequence,
      stale: false,
      gap: row.gap,
      outOfOrder: row.outOfOrder,
      duplicate: row.duplicate,
    }));
    const proposals: ProposalQuote[] = proposalRows.map((row) => {
      const assumptions = {
        contractType: row.contractType as "CALL" | "PUT",
        underlyingSymbol: row.underlyingSymbol,
        durationSeconds: row.durationSeconds as 60 | 180 | 300,
        amount: row.amount,
        basis: row.basis as "stake" | "payout",
        currency: row.currency,
      };
      return {
        key: proposalKey(assumptions),
        assumptions,
        proposalId: row.proposalId,
        askPrice: row.askPrice,
        payout: row.payout,
        effectivePayout: row.effectivePayout,
        breakEven: row.breakEven,
        state: row.state as ProposalQuote["state"],
        requestedAt: row.requestedAt,
        receivedAt: row.receivedAt,
        source: "parquet",
      };
    });
    const fileHashes: Record<string, string> = {};
    const datasetRoot = statSync(datasetPath).isDirectory() ? datasetPath : dirname(datasetPath);
    for (const file of passport.files) {
      const candidates = [file.path, join(datasetRoot, file.path), join(process.cwd(), file.path)];
      const resolved = candidates.find((candidate) => existsSync(candidate));
      if (resolved === undefined) throw new Error(`Passport file not found: ${file.path}`);
      fileHashes[file.path] = fileSha256(readFileSync(resolved));
    }
    return admitResearchDataset({ ticks, proposals, passport, fileHashes });
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

async function loadDataset(name: string, seed: number, datasetPath: string | null, passportPath: string | null, datasetId: string | null): Promise<LabDataset> {
  if (datasetPath !== null || passportPath !== null) {
    if (datasetPath === null || passportPath === null) throw new Error("--dataset-path and --passport are required together");
    return loadParquetDataset(datasetPath, passportPath, datasetId);
  }
  if (name === "synth") return fixtureDataset(seed);
  if (name === "quant-fixture") return committedDataset();
  throw new Error(`unknown dataset: ${name} (expected synth|quant-fixture)`);
}

async function main(): Promise<void> {
  const { command, seed, dataset: datasetName, datasetPath, passportPath, datasetId } = parseArgs(process.argv.slice(2));
  if (command === "inspect") {
    const dataset = await loadDataset(datasetName, seed, datasetPath, passportPath, datasetId);
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
    const dataset = await loadDataset(datasetName, seed, datasetPath, passportPath, datasetId);
    const profile = ALL_PROFILES[0];
    if (!profile) throw new Error("no profiles");
    const engine = makeEngine(profile.strategy, seedPreset(profile).preset);
    // Replay the dataset's own lead symbol and time range (works for both
    // synthetic output and the committed quant-fixture).
    const symbol = [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))].sort()[0] ?? "SYNTH_A";
    const times = dataset.ticks.map((t) => t.eventTime);
    const output = runReplay({
      mode: "proposal-aware",
      ticks: dataset.ticks.filter((t) => t.underlyingSymbol === symbol),
      proposals: dataset.proposals,
      runners: [toReplayRunner(engine, profile, symbol, "seed-1")],
      fromTime: Math.min(...times),
      toTime: Math.max(...times),
      stepTicks: 5,
      settlementToleranceSeconds: 10,
      flatEpsilon: 0,
      economics: cliEconomics(),
      codeVersion: "wp03-cli-1",
      datasetHash: dataset.datasetHash,
      datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
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
    const dataset = await loadDataset(datasetName, seed, datasetPath, passportPath, datasetId);
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
    const dataset = await loadDataset(datasetName, seed, datasetPath, passportPath, datasetId);
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
    const dataset = await loadDataset(datasetName, seed, datasetPath, passportPath, datasetId);
    const symbol = [...new Set(dataset.ticks.map((t) => t.underlyingSymbol))].sort()[0] ?? "SYNTH_A";
    const times = dataset.ticks.map((t) => t.eventTime);
    const runners = ALL_PROFILES.slice(0, 3).map((profile) => {
      const engine = makeEngine(profile.strategy, seedPreset(profile).preset);
      return toReplayRunner(engine, profile, symbol, "seed-1");
    });
    const output = runReplay({
      mode: "proposal-aware",
      ticks: dataset.ticks.filter((t) => t.underlyingSymbol === symbol),
      proposals: dataset.proposals,
      runners,
      fromTime: Math.min(...times),
      toTime: Math.max(...times),
      stepTicks: 5,
      settlementToleranceSeconds: 10,
      flatEpsilon: 0,
      economics: cliEconomics(),
      codeVersion: "wp03-cli-1",
      datasetHash: dataset.datasetHash,
      datasetPassportHash: dataset.passport?.manifestHash ?? dataset.datasetHash,
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
  await main();
} catch (error: unknown) {
  console.error(`dt-research failed: ${String(error)}`);
  process.exit(1);
}
