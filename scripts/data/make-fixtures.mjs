#!/usr/bin/env node
// Deterministic Parquet fixture generator (DT-WP-02 evidence).
// Writes a tiny canonical tick + proposal dataset via DuckDB into
// packages/research/fixtures/ with a manifest (paths, rows, SHA-256,
// Passport hash). Re-running with the same code produces identical bytes.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DuckDBInstance } from "@duckdb/node-api";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "packages", "research", "fixtures");
const PARSER = "deriv-options-2026-09-18";
const BUILD = process.env["BUILD_SHA"] ?? "local-dev";

const TICKS = [];
for (let i = 0; i < 12; i += 1) {
  TICKS.push({
    symbol: "frxEURUSD",
    eventTime: 1_700_000_000 + i,
    quote: 1.085 + i * 0.0001,
    sequence: i + 1,
  });
}
for (let i = 0; i < 8; i += 1) {
  TICKS.push({
    symbol: "R_100",
    eventTime: 1_700_000_000 + i,
    quote: 500 + i,
    sequence: 100 + i,
  });
}

const PROPOSALS = [];
for (const [symbol, expiry, ask, payout] of [
  ["frxEURUSD", 60, 10, 19],
  ["frxEURUSD", 180, 10, 18.2],
  ["frxEURUSD", 300, 10, 17.5],
  ["R_100", 60, 10, 19.4],
  ["R_100", 180, 10, 18.8],
  ["R_100", 300, 1, 1],
]) {
  PROPOSALS.push({ symbol, expiry, ask, payout });
}

const quote = (v) => `'${String(v).replace(/'/g, "''")}'`;

const instance = await DuckDBInstance.create(":memory:");
const connection = await instance.connect();

await connection.run(`CREATE TABLE ticks(
  underlying_symbol VARCHAR, event_time BIGINT, receive_time VARCHAR,
  quote DOUBLE, pip_size DOUBLE, source_connection_id VARCHAR, sequence BIGINT,
  gap BOOLEAN, out_of_order BOOLEAN, duplicate BOOLEAN,
  parser_version VARCHAR, build_sha VARCHAR)`);
for (const t of TICKS) {
  await connection.run(
    `INSERT INTO ticks VALUES (${quote(t.symbol)}, ${String(t.eventTime)}, '2026-09-18T00:00:00.000Z', ${String(t.quote)}, 0.0001, 'fixture', ${String(t.sequence)}, false, false, false, ${quote(PARSER)}, ${quote(BUILD)})`,
  );
}

await connection.run(`CREATE TABLE proposals(
  underlying_symbol VARCHAR, contract_type VARCHAR, duration_seconds INTEGER,
  amount DOUBLE, basis VARCHAR, currency VARCHAR,
  ask_price DOUBLE, payout DOUBLE, effective_payout DOUBLE, break_even DOUBLE,
  proposal_id VARCHAR, state VARCHAR, requested_at VARCHAR, received_at VARCHAR,
  parser_version VARCHAR, build_sha VARCHAR)`);
for (const [index, p] of PROPOSALS.entries()) {
  const effective = (p.payout - p.ask) / p.ask;
  await connection.run(
    `INSERT INTO proposals VALUES (${quote(p.symbol)}, 'CALL', ${String(p.expiry)}, 10, 'stake', 'USD', ${String(p.ask)}, ${String(p.payout)}, ${String(effective)}, ${String(p.ask / p.payout)}, 'fixture-${String(index)}', 'KNOWN', '2026-09-18T00:00:00.000Z', '2026-09-18T00:00:01.000Z', ${quote(PARSER)}, ${quote(BUILD)})`,
  );
}

mkdirSync(OUT, { recursive: true });
const tickPath = join(OUT, "ticks-part-0001.parquet");
const proposalPath = join(OUT, "proposals-part-0001.parquet");
await connection.run(`COPY ticks TO '${tickPath.replace(/'/g, "''")}' (FORMAT PARQUET, COMPRESSION 'SNAPPY')`);
await connection.run(`COPY proposals TO '${proposalPath.replace(/'/g, "''")}' (FORMAT PARQUET, COMPRESSION 'SNAPPY')`);
connection.closeSync();

const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const manifest = {
  datasetId: "dt-wp02-fixture-v1",
  parserVersion: PARSER,
  buildSha: BUILD,
  files: [
    { path: "packages/research/fixtures/ticks-part-0001.parquet", sha256: sha(tickPath), rows: TICKS.length },
    { path: "packages/research/fixtures/proposals-part-0001.parquet", sha256: sha(proposalPath), rows: PROPOSALS.length },
  ],
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
