/**
 * Research plane entry (DT-WP-02).
 * Capture rows, DuckDB/Parquet I/O, Passport, DQG, recovery and compaction.
 * No economic actions; analytical reads only.
 */
export type { TickRow, ProposalRow, CaptureDegradation, BatchWriterOptions } from "./capture.js";
export { toTickRow, toProposalRow, BatchWriter } from "./capture.js";
export {
  openMemory,
  insertTicks,
  insertProposals,
  finalizeParquet,
  readParquetCount,
  readParquetTicks,
  tickPartition,
  proposalPartition,
  sanitize,
  PARQUET_COMPRESSION,
} from "./parquet.js";
export { createPassport, verifyPassport, canonicalJson, sha256Hex, fileSha256 } from "./passport.js";
export type { DatasetPassport, PassportFile, PassportInput } from "./passport.js";
export { checkTicks, checkProposals, checkPartitionOverlap, blocksDataset } from "./dqg.js";
export type { DqgFinding, DqgOptions, DqgSeverity } from "./dqg.js";
export { recoverDirectory, diskStatus, sha256File, verifyCompaction, fileSizeMb } from "./recovery.js";
export type { RecoveryReport, DiskStatus, CompactionPlan } from "./recovery.js";
export function summarizeDataset(rows: readonly { symbol: string }[]): {
  readonly name: string;
  readonly rows: number;
  readonly symbols: readonly string[];
} {
  const symbols = [...new Set(rows.map((r) => r.symbol))].sort();
  return { name: "foundation", rows: rows.length, symbols };
}
