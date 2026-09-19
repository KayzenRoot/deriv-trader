import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  blocksDataset,
  checkProposals,
  checkTicks,
  createPassport,
  fileSha256,
  openMemory,
  readParquetCount,
  readParquetTicks,
  readParquetProposals,
  verifyPassport,
} from "./index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TICKS = join(HERE, "..", "fixtures", "ticks-part-0001.parquet");
const PROPOSALS = join(HERE, "..", "fixtures", "proposals-part-0001.parquet");
const MANIFEST = join(HERE, "..", "fixtures", "manifest.json");

describe("committed fixtures (DT-WP-02 evidence)", () => {
  it("reads canonical tick/proposal partitions with expected rows", async () => {
    expect(existsSync(TICKS)).toBe(true);
    expect(existsSync(PROPOSALS)).toBe(true);
    const { connection } = await openMemory();
    try {
      expect(await readParquetCount(connection, TICKS)).toBe(20);
      expect(await readParquetCount(connection, PROPOSALS)).toBe(6);
      const ticks = await readParquetTicks(connection, TICKS);
      expect(ticks.map((t) => t.underlyingSymbol).filter((s) => s === "frxEURUSD")).toHaveLength(12);
      expect(blocksDataset(checkTicks(ticks))).toBe(false);
      const proposals = await readParquetProposals(connection, PROPOSALS);
      expect(proposals).toHaveLength(6);
      expect(blocksDataset(checkProposals(proposals))).toBe(false);
    } finally {
      connection.closeSync();
    }
  });

  it("matches the committed manifest hashes", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      files: { path: string; sha256: string; rows: number }[];
    };
    const byPath = new Map(manifest.files.map((f) => [f.path, f]));
    const tickEntry = byPath.get("packages/research/fixtures/ticks-part-0001.parquet");
    const proposalEntry = byPath.get("packages/research/fixtures/proposals-part-0001.parquet");
    expect(tickEntry?.rows).toBe(20);
    expect(proposalEntry?.rows).toBe(6);
    expect(fileSha256(readFileSync(TICKS))).toBe(tickEntry?.sha256);
    expect(fileSha256(readFileSync(PROPOSALS))).toBe(proposalEntry?.sha256);
  });

  it("builds a verifiable passport over the fixtures", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      files: { path: string; sha256: string; rows: number }[];
    };
    const passport = createPassport({
      datasetId: "dt-wp02-fixture-v1",
      createdAt: "2026-09-18T00:00:00.000Z",
      collectorSha: "local-dev",
      parserVersion: "deriv-options-2026-09-18",
      sourceEndpoints: ["wss://api.derivws.com/trading/v1/options/ws/public"],
      environment: "DEMO",
      symbols: ["R_100", "frxEURUSD"],
      timeRange: { start: "2026-09-18T00:00:00.000Z", end: "2026-09-18T01:00:00.000Z" },
      files: manifest.files,
    });
    expect(verifyPassport(passport)).toBe(true);
    expect(passport.totalRows).toBe(26);
    const proposals = [
      {
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
        requestedAt: "",
        receivedAt: "",
        parserVersion: "deriv-options-2026-09-18",
        buildSha: "local-dev",
      },
    ];
    expect(blocksDataset(checkProposals(proposals))).toBe(false);
  });
});
