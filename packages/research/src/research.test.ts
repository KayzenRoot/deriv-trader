import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import {
  BatchWriter,
  blocksDataset,
  checkPartitionOverlap,
  checkProposals,
  checkTicks,
  createPassport,
  diskStatus,
  fileSha256,
  finalizeParquet,
  insertProposals,
  insertTicks,
  openMemory,
  readParquetCount,
  readParquetTicks,
  recoverDirectory,
  toProposalRow,
  toTickRow,
  verifyCompaction,
  verifyPassport,
  type ProposalRow,
  type TickRow,
} from "./index.js";

const PROVENANCE = { parserVersion: "deriv-options-2026-09-18", buildSha: "test-sha" };

function tickRow(overrides: Partial<TickRow> = {}): TickRow {
  return {
    underlyingSymbol: "frxEURUSD",
    eventTime: 1_700_000_000,
    receiveTime: "2026-09-18T00:00:01.000Z",
    quote: 1.0851,
    pipSize: 0.0001,
    sourceConnectionId: "c1",
    sequence: 1,
    gap: false,
    outOfOrder: false,
    duplicate: false,
    parserVersion: PROVENANCE.parserVersion,
    buildSha: PROVENANCE.buildSha,
    ...overrides,
  };
}

function proposalRow(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    underlyingSymbol: "frxEURUSD",
    contractType: "CALL",
    durationSeconds: 60,
    amount: 10,
    basis: "stake",
    currency: "USD",
    askPrice: 10,
    payout: 19,
    effectivePayout: 0.9,
    breakEven: 10 / 19,
    proposalId: "p1",
    state: "KNOWN",
    requestedAt: "2026-09-18T00:00:00.000Z",
    receivedAt: "2026-09-18T00:00:01.000Z",
    parserVersion: PROVENANCE.parserVersion,
    buildSha: PROVENANCE.buildSha,
    ...overrides,
  };
}

let shared: { instance: DuckDBInstance; connection: DuckDBConnection } | null = null;

async function db(): Promise<{ instance: DuckDBInstance; connection: DuckDBConnection }> {
  if (!shared) shared = await openMemory();
  return shared;
}

afterAll(() => {
  shared?.connection.closeSync();
  shared = null;
});

describe("parquet roundtrip (DuckDB)", () => {
  it("writes and reads ticks with row preservation", async () => {
    const { connection } = await db();
    const dir = mkdtempSync(join(tmpdir(), "dt-ticks-"));
    const rows = [tickRow({ sequence: 1 }), tickRow({ sequence: 2, eventTime: 1_700_000_001 })];
    await insertTicks(connection, rows);
    const finalPath = join(dir, "part-0001.parquet");
    await finalizeParquet(connection, "ticks", finalPath);
    expect(await readParquetCount(connection, finalPath)).toBe(2);
    const back = await readParquetTicks(connection, finalPath);
    expect(back.map((r) => r.sequence)).toEqual([1, 2]);
    expect(back[0]?.quote).toBeCloseTo(1.0851, 10);
  });

  it("roundtrips proposals including UNKNOWN economics", async () => {
    const { connection } = await db();
    const dir = mkdtempSync(join(tmpdir(), "dt-prop-"));
    const rows = [proposalRow(), proposalRow({ proposalId: null, state: "UNKNOWN", askPrice: null, payout: null, effectivePayout: null, breakEven: null })];
    await insertProposals(connection, rows);
    const finalPath = join(dir, "part-0001.parquet");
    await finalizeParquet(connection, "proposals", finalPath);
    expect(await readParquetCount(connection, finalPath)).toBe(2);
  });
});

describe("dataset passport", () => {
  it("is stable for identical inputs and sensitive to changes", () => {
    const input = {
      datasetId: "ds_ticks_2026-09-18",
      createdAt: "2026-09-18T00:00:00.000Z",
      collectorSha: "abc123",
      parserVersion: PROVENANCE.parserVersion,
      sourceEndpoints: ["wss://api.derivws.com/trading/v1/options/ws/public"],
      environment: "DEMO",
      symbols: ["frxEURUSD"],
      timeRange: { start: "2026-09-18T00:00:00.000Z", end: "2026-09-18T01:00:00.000Z" },
      files: [{ path: "part-0001.parquet", sha256: "aa", rows: 2 }],
    };
    const first = createPassport(input);
    const second = createPassport(input);
    expect(first.manifestHash).toBe(second.manifestHash);
    expect(verifyPassport(first)).toBe(true);
    const changed = createPassport({ ...input, files: [{ path: "part-0001.parquet", sha256: "bb", rows: 2 }] });
    expect(changed.manifestHash).not.toBe(first.manifestHash);
    expect(first.totalRows).toBe(2);
  });
});

describe("data quality gate", () => {
  it("detects duplicates, gaps, skew and invalid quotes", () => {
    const rows = [
      tickRow({ sequence: 1, eventTime: 100 }),
      tickRow({ sequence: 2, eventTime: 100 }),
      tickRow({ sequence: 3, eventTime: 500 }),
      tickRow({ sequence: 4, eventTime: 501, quote: -1 }),
    ];
    const findings = checkTicks(rows, { maxGapSeconds: 30, maxSkewSeconds: 3600 * 24 * 365 });
    const checks = new Map(findings.map((f) => [f.check, f]));
    expect(checks.get("duplicates")?.severity).toBe("WARN");
    expect(checks.get("gaps")?.severity).toBe("WARN");
    expect(checks.get("invalid-quote")?.severity).toBe("BLOCK_TRADING_INPUT");
    expect(blocksDataset(findings)).toBe(true);
  });

  it("detects non-monotonic time and partition overlap", () => {
    const rows = [tickRow({ sequence: 2, eventTime: 200 }), tickRow({ sequence: 1, eventTime: 100 })];
    const findings = checkTicks(rows);
    expect(findings.some((f) => f.check === "non-monotonic-time")).toBe(true);
    const overlap = checkPartitionOverlap([
      { name: "a", start: 0, end: 100 },
      { name: "b", start: 50, end: 150 },
    ]);
    expect(overlap[0]?.severity).toBe("BLOCK_DATASET");
    expect(checkPartitionOverlap([{ name: "a", start: 0, end: 50 }])).toEqual([]);
  });

  it("rejects proposals with bad economics or missing identity", () => {
    const findings = checkProposals([
      proposalRow({ askPrice: 0 }),
      proposalRow({ underlyingSymbol: "" }),
    ]);
    expect(findings.some((f) => f.check === "invalid-economics")).toBe(true);
    expect(findings.some((f) => f.check === "missing-contract-identity")).toBe(true);
  });
});

describe("recovery, disk pressure and compaction", () => {
  it("quarantines unreadable in-progress files and finalizes readable ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "dt-recover-"));
    const quarantine = join(dir, "quarantine");
    writeFileSync(join(dir, "part-0002.parquet.inprogress"), "not-parquet-bytes");
    writeFileSync(join(dir, "part-0003.parquet.inprogress"), "also-bad");
    const report = recoverDirectory(dir, quarantine, () => false);
    expect(report.scanned).toBe(2);
    expect(report.quarantined).toHaveLength(2);
    const report2 = recoverDirectory(dir, quarantine, () => true);
    expect(report2.scanned).toBe(0);
  });

  it("exposes disk warning/stop thresholds", () => {
    expect(diskStatus(2048, { warnMb: 1024, stopMb: 256 })).toEqual({
      freeMb: 2048,
      warn: false,
      stop: false,
    });
    expect(diskStatus(100, { warnMb: 1024, stopMb: 256 }).stop).toBe(true);
  });

  it("verifies compaction row counts and hashes", () => {
    expect(verifyCompaction([2, 3], ["aa", "bb"], 5, fileSha256(Buffer.from("aa|bb")))).toBe(true);
    expect(verifyCompaction([2, 3], ["aa", "bb"], 4, fileSha256(Buffer.from("aa|bb")))).toBe(false);
  });

  it("degrades optional capture explicitly under pressure", () => {
    const flushed: TickRow[][] = [];
    const writer = new BatchWriter<TickRow>({
      maxRows: 2,
      onFlush: (rows) => flushed.push([...rows] as TickRow[]),
      shouldDegrade: () => "RESEARCH_PAUSED",
    });
    writer.push(tickRow());
    expect(writer.droppedCount()).toBe(1);
    expect(writer.pending()).toBe(0);
    expect(flushed).toHaveLength(0);
  });

  it("maps domain ticks and quotes into rows with provenance", () => {
    const row = toTickRow(
      {
        underlyingSymbol: "R_100",
        eventTime: 42,
        receiveTime: "2026-09-18T00:00:42.000Z",
        quote: 500,
        pipSize: null,
        sourceConnectionId: "c9",
        reqId: null,
        subscriptionId: null,
        sequence: 9,
        stale: false,
        gap: false,
        outOfOrder: false,
        duplicate: false,
      },
      PROVENANCE,
    );
    expect(row.buildSha).toBe("test-sha");
    const proof = toProposalRow(
      {
        key: "k",
        assumptions: {
          contractType: "PUT",
          underlyingSymbol: "R_100",
          durationSeconds: 180,
          amount: 10,
          basis: "stake",
          currency: "USD",
        },
        proposalId: "p9",
        askPrice: 10,
        payout: 18,
        effectivePayout: 0.8,
        breakEven: 10 / 18,
        state: "KNOWN",
        requestedAt: "2026-09-18T00:00:00.000Z",
        receivedAt: "2026-09-18T00:00:01.000Z",
        source: "test",
      },
      PROVENANCE,
    );
    expect(proof.durationSeconds).toBe(180);
    expect(fileSha256(Buffer.from("provenance"))).toHaveLength(64);
  });
});
