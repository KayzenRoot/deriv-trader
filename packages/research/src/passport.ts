/**
 * Dataset Passport: immutable manifest model (DT-WP-02 Phase H).
 * SHA-256 over canonical JSON. Same inputs always reproduce the same hash;
 * corrections create new dataset versions, never silent mutation.
 */
import { createHash } from "node:crypto";

export interface PassportFile {
  readonly path: string;
  readonly sha256: string;
  readonly rows: number;
}

export interface DatasetPassport {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly createdAt: string;
  readonly collectorSha: string;
  readonly parserVersion: string;
  readonly schemaVersion: string;
  readonly sourceEndpoints: readonly string[];
  readonly environment: string;
  readonly symbols: readonly string[];
  readonly timeRange: { readonly start: string; readonly end: string };
  readonly files: readonly PassportFile[];
  readonly totalRows: number;
  readonly gaps: readonly string[];
  readonly anomalies: readonly string[];
  readonly proposalCoverage: readonly string[];
  readonly compression: string;
  readonly format: string;
  readonly parentDatasetId: string | null;
  readonly manifestHash: string;
}

export interface PassportInput {
  readonly datasetId: string;
  readonly datasetVersion?: string;
  readonly createdAt?: string;
  readonly collectorSha: string;
  readonly parserVersion: string;
  readonly schemaVersion?: string;
  readonly sourceEndpoints: readonly string[];
  readonly environment: string;
  readonly symbols: readonly string[];
  readonly timeRange: { readonly start: string; readonly end: string };
  readonly files: readonly PassportFile[];
  readonly gaps?: readonly string[];
  readonly anomalies?: readonly string[];
  readonly proposalCoverage?: readonly string[];
  readonly compression?: string;
  readonly parentDatasetId?: string | null;
}

/** Canonical JSON: sorted keys, stable for hashing. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    const text: unknown = JSON.stringify(value);
    return typeof text === "string" ? text : "null";
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
}

export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function fileSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createPassport(input: PassportInput): DatasetPassport {
  const sortedFiles = [...input.files].sort((a, b) => (a.path < b.path ? -1 : 1));
  const totalRows = sortedFiles.reduce((sum, f) => sum + f.rows, 0);
  const createdAt = input.createdAt ?? new Date().toISOString();
  // Identity hash covers content-defining fields only. createdAt is retained
  // as metadata but excluded from the hash, so identical caller inputs always
  // reproduce the identical manifest (F8 reproducibility contract).
  const identity = {
    datasetId: input.datasetId,
    datasetVersion: input.datasetVersion ?? "1",
    collectorSha: input.collectorSha,
    parserVersion: input.parserVersion,
    schemaVersion: input.schemaVersion ?? "1.0.0",
    sourceEndpoints: [...input.sourceEndpoints].sort(),
    environment: input.environment,
    symbols: [...input.symbols].sort(),
    timeRange: input.timeRange,
    files: sortedFiles,
    totalRows,
    gaps: [...(input.gaps ?? [])].sort(),
    anomalies: [...(input.anomalies ?? [])].sort(),
    proposalCoverage: [...(input.proposalCoverage ?? [])].sort(),
    compression: input.compression ?? "SNAPPY",
    format: "parquet",
    parentDatasetId: input.parentDatasetId ?? null,
  };
  return { ...identity, createdAt, manifestHash: sha256Hex(canonicalJson(identity)) };
}

export function verifyPassport(passport: DatasetPassport): boolean {
  const body: Record<string, unknown> = { ...passport };
  delete body["manifestHash"];
  delete body["createdAt"];
  return sha256Hex(canonicalJson(body)) === passport.manifestHash;
}
