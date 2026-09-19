/**
 * DuckDB + Parquet helpers (DT-WP-02 Phase G).
 * Single analytical engine. Partitioned writes with bounded batches, temp
 * output validated before atomic finalize/rename, immutable closed files.
 */
import { mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";
import type { ProposalRow, TickRow } from "./capture.js";

export const PARQUET_COMPRESSION = "SNAPPY";

export function tickPartition(date: string, symbol: string): string {
  return join("data", "normalized", "ticks", `date=${date}`, `symbol=${sanitize(symbol)}`);
}

export function proposalPartition(date: string, symbol: string, expirySeconds: number): string {
  return join(
    "data",
    "proposals",
    `date=${date}`,
    `symbol=${sanitize(symbol)}`,
    `expiry_s=${String(expirySeconds)}`,
  );
}

export function sanitize(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 64) || "unknown";
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

function sqlBool(value: boolean): string {
  return value ? "true" : "false";
}

export async function openMemory(): Promise<{ instance: DuckDBInstance; connection: DuckDBConnection }> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  return { instance, connection };
}

const TICK_DDL = `CREATE TABLE ticks(
  underlying_symbol VARCHAR, event_time BIGINT, receive_time VARCHAR,
  quote DOUBLE, pip_size DOUBLE, source_connection_id VARCHAR, sequence BIGINT,
  gap BOOLEAN, out_of_order BOOLEAN, duplicate BOOLEAN,
  parser_version VARCHAR, build_sha VARCHAR
)`;

const PROPOSAL_DDL = `CREATE TABLE proposals(
  underlying_symbol VARCHAR, contract_type VARCHAR, duration_seconds INTEGER,
  amount DOUBLE, basis VARCHAR, currency VARCHAR,
  ask_price DOUBLE, payout DOUBLE, effective_payout DOUBLE, break_even DOUBLE,
  proposal_id VARCHAR, state VARCHAR, requested_at VARCHAR, received_at VARCHAR,
  parser_version VARCHAR, build_sha VARCHAR
)`;

export async function insertTicks(connection: DuckDBConnection, rows: TickRow[]): Promise<void> {
  await connection.run("DROP TABLE IF EXISTS ticks");
  await connection.run(TICK_DDL);
  for (const row of rows) {
    await connection.run(
      `INSERT INTO ticks VALUES (${sqlString(row.underlyingSymbol)}, ${String(row.eventTime)}, ${sqlString(row.receiveTime)}, ${String(row.quote)}, ${sqlNumber(row.pipSize)}, ${sqlString(row.sourceConnectionId)}, ${String(row.sequence)}, ${sqlBool(row.gap)}, ${sqlBool(row.outOfOrder)}, ${sqlBool(row.duplicate)}, ${sqlString(row.parserVersion)}, ${sqlString(row.buildSha)})`,
    );
  }
}

export async function insertProposals(
  connection: DuckDBConnection,
  rows: ProposalRow[],
): Promise<void> {
  await connection.run("DROP TABLE IF EXISTS proposals");
  await connection.run(PROPOSAL_DDL);
  for (const row of rows) {
    await connection.run(
      `INSERT INTO proposals VALUES (${sqlString(row.underlyingSymbol)}, ${sqlString(row.contractType)}, ${String(row.durationSeconds)}, ${String(row.amount)}, ${sqlString(row.basis)}, ${sqlString(row.currency)}, ${sqlNumber(row.askPrice)}, ${sqlNumber(row.payout)}, ${sqlNumber(row.effectivePayout)}, ${sqlNumber(row.breakEven)}, ${row.proposalId === null ? "NULL" : sqlString(row.proposalId)}, ${sqlString(row.state)}, ${sqlString(row.requestedAt)}, ${sqlString(row.receivedAt)}, ${sqlString(row.parserVersion)}, ${sqlString(row.buildSha)})`,
    );
  }
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // DuckDB BIGINT columns surface as JS bigint.
  if (typeof value === "bigint") {
    const asDouble = Number(value);
    return Number.isFinite(asDouble) ? asDouble : 0;
  }
  return 0;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const asDouble = Number(value);
    return Number.isFinite(asDouble) ? asDouble : null;
  }
  return null;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function firstCountCell(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  const first: unknown = rows[0];
  if (!Array.isArray(first)) return 0;
  const cell: unknown = first[0];
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (typeof cell === "bigint") {
    const asDouble = Number(cell);
    return Number.isFinite(asDouble) ? asDouble : 0;
  }
  return 0;
}

async function tableCount(connection: DuckDBConnection, table: string): Promise<number> {
  const reader = await connection.runAndReadAll(`SELECT COUNT(*) AS n FROM ${table}`);
  return firstCountCell(reader.getRows());
}

/**
 * Write table to temp Parquet, validate row count, then atomically rename to
 * the final partition path. Returns the final path.
 */
export async function finalizeParquet(
  connection: DuckDBConnection,
  table: string,
  finalPath: string,
): Promise<string> {
  const expected = await tableCount(connection, table);
  mkdirSync(dirname(finalPath), { recursive: true });
  const tempPath = `${finalPath}.inprogress`;
  await connection.run(
    `COPY ${table} TO ${sqlString(tempPath)} (FORMAT PARQUET, COMPRESSION '${PARQUET_COMPRESSION}')`,
  );
  const check = await connection.runAndReadAll(
    `SELECT COUNT(*) AS n FROM read_parquet(${sqlString(tempPath)})`,
  );
  const actual = firstCountCell(check.getRows());
  if (actual !== expected) {
    throw new Error(`parquet validation failed for ${finalPath}: ${String(actual)} !== ${String(expected)}`);
  }
  renameSync(tempPath, finalPath);
  return finalPath;
}

export async function readParquetCount(connection: DuckDBConnection, path: string): Promise<number> {
  const reader = await connection.runAndReadAll(
    `SELECT COUNT(*) AS n FROM read_parquet(${sqlString(path)})`,
  );
  return firstCountCell(reader.getRows());
}

/**
 * Merge small exploratory Parquet files into one partition file (F9):
 * union inputs, write temp, validate row preservation, atomic rename.
 * Returns row count plus the final file hash for evidence.
 */
export async function compactParquetFiles(
  connection: DuckDBConnection,
  inputs: string[],
  output: string,
  fileSha: (bytes: Uint8Array) => string,
): Promise<{ rows: number; sha256: string }> {
  if (inputs.length === 0) throw new Error("compaction needs at least one input");
  const list = inputs.map((p) => sqlString(p)).join(", ");
  await connection.run("DROP TABLE IF EXISTS compact_src");
  await connection.run(`CREATE TABLE compact_src AS SELECT * FROM read_parquet([${list}])`);
  const finalPath = await finalizeParquet(connection, "compact_src", output);
  const { readFileSync } = await import("node:fs");
  const rows = await readParquetCount(connection, finalPath);
  return { rows, sha256: fileSha(readFileSync(finalPath)) };
}

export async function readParquetTicks(
  connection: DuckDBConnection,
  path: string,
): Promise<TickRow[]> {
  const reader = await connection.runAndReadAll(
    `SELECT * FROM read_parquet(${sqlString(path)}) ORDER BY event_time, sequence`,
  );
  const objects = reader.getRowObjects() as Record<string, unknown>[];
  return objects.map((r) => ({
    underlyingSymbol: asText(r["underlying_symbol"]),
    eventTime: asNumber(r["event_time"]),
    receiveTime: asText(r["receive_time"]),
    quote: asNumber(r["quote"]),
    pipSize: asNullableNumber(r["pip_size"]),
    sourceConnectionId: asText(r["source_connection_id"]),
    sequence: asNumber(r["sequence"]),
    gap: asBool(r["gap"]),
    outOfOrder: asBool(r["out_of_order"]),
    duplicate: asBool(r["duplicate"]),
    parserVersion: asText(r["parser_version"]),
    buildSha: asText(r["build_sha"]),
  }));
}

export async function readParquetProposals(
  connection: DuckDBConnection,
  path: string,
): Promise<ProposalRow[]> {
  const reader = await connection.runAndReadAll(
    `SELECT * FROM read_parquet(${sqlString(path)}) ORDER BY received_at, underlying_symbol, duration_seconds`,
  );
  const objects = reader.getRowObjects() as Record<string, unknown>[];
  return objects.map((r) => ({
    underlyingSymbol: asText(r["underlying_symbol"]),
    contractType: asText(r["contract_type"]),
    durationSeconds: asNumber(r["duration_seconds"]),
    amount: asNumber(r["amount"]),
    basis: asText(r["basis"]),
    currency: asText(r["currency"]),
    askPrice: asNullableNumber(r["ask_price"]),
    payout: asNullableNumber(r["payout"]),
    effectivePayout: asNullableNumber(r["effective_payout"]),
    breakEven: asNullableNumber(r["break_even"]),
    proposalId: r["proposal_id"] === null || r["proposal_id"] === undefined ? null : asText(r["proposal_id"]),
    state: asText(r["state"]),
    requestedAt: asText(r["requested_at"]),
    receivedAt: asText(r["received_at"]),
    parserVersion: asText(r["parser_version"]),
    buildSha: asText(r["build_sha"]),
  }));
}
