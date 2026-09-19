#!/usr/bin/env node
// Deterministic quant fixture generator (DT-WP-03).
// Small synthetic tick/proposal pack with passport, committed to git.
// Synthetic by construction: exercises machinery, proves no edge.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateProposals, generateTicks } from "@deriv-trader/research";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "packages", "research", "fixtures", "quant-v1");

const ticks = generateTicks({
  symbol: "SYNTH",
  startEpoch: 1_700_000_000,
  ticks: 600,
  basePrice: 100,
  seed: 20260918,
  regimes: ["trend_up", "range", "trend_down", "range", "breakout_up", "micro_burst"],
});
const proposals = generateProposals({
  symbols: ["SYNTH"],
  expiries: [60, 180, 300],
  effectivePayout: 0.9,
  startEpoch: 1_700_000_000,
  everyTicks: 25,
  rounds: 20,
});

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "ticks.json"), `${JSON.stringify(ticks)}\n`);
writeFileSync(join(OUT, "proposals.json"), `${JSON.stringify(proposals)}\n`);
const manifest = {
  datasetId: "quant-fixture-v1",
  seed: 20260918,
  ticks: ticks.length,
  proposals: proposals.length,
  grade: "synthetic",
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest));
