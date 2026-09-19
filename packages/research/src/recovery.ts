/**
 * Recovery, disk pressure and compaction (DT-WP-02 Phase H).
 * Startup discovery quarantines unfinished/corrupt files instead of appending
 * blindly; compaction merges exploratory small files with row/hash proof.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export interface RecoveryReport {
  readonly scanned: number;
  readonly finalized: number;
  readonly quarantined: string[];
}

/**
 * Discover `*.inprogress*` leftovers. Entries readable as Parquet by the
 * caller-supplied validator are finalized; the rest are quarantined.
 * Never appends to an ambiguous closed file.
 */
export function recoverDirectory(
  directory: string,
  quarantineDir: string,
  isReadable: (path: string) => boolean,
): RecoveryReport {
  if (!existsSync(directory)) return { scanned: 0, finalized: 0, quarantined: [] };
  const quarantined: string[] = [];
  let scanned = 0;
  let finalized = 0;
  mkdirSync(quarantineDir, { recursive: true });
  for (const entry of readdirSync(directory)) {
    if (!entry.includes(".inprogress")) continue;
    scanned += 1;
    const full = join(directory, entry);
    let readable: boolean;
    try {
      readable = isReadable(full);
    } catch {
      readable = false;
    }
    if (readable) {
      const finalName = entry.replace(/\.inprogress.*$/, "");
      renameSync(full, join(directory, finalName || entry));
      finalized += 1;
    } else {
      const target = join(quarantineDir, basename(full));
      renameSync(full, target);
      quarantined.push(target);
    }
  }
  return { scanned, finalized, quarantined };
}

export interface DiskStatus {
  readonly freeMb: number;
  readonly warn: boolean;
  readonly stop: boolean;
}

export function diskStatus(
  freeMb: number,
  thresholds: { warnMb: number; stopMb: number },
): DiskStatus {
  return {
    freeMb,
    warn: freeMb < thresholds.warnMb,
    stop: freeMb < thresholds.stopMb,
  };
}

export function sha256File(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface CompactionPlan {
  readonly inputs: string[];
  readonly output: string;
}

/**
 * Deterministic multiset digest over actual row content (F9). Rows are
 * canonicalized, sorted and hashed together, so the digest is independent of
 * input file order but sensitive to any content change.
 */
export function digestRows(rows: readonly unknown[]): string {
  const canonical = rows.map((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      const text: unknown = JSON.stringify(row);
      return typeof text === "string" ? text : "null";
    }
    const record = row as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const parts = keys.map((key) => {
      const value: unknown = record[key];
      const text: unknown = JSON.stringify(value);
      return `${JSON.stringify(key)}:${typeof text === "string" ? text : "null"}`;
    });
    return `{${parts.join(",")}}`;
  });
  canonical.sort();
  return createHash("sha256").update(canonical.join("\n"), "utf8").digest("hex");
}

/**
 * Content-based compaction proof (F9): merged rows must preserve the exact
 * multiset (row count plus content digest) of the inputs.
 */
export function verifyCompactionContent(
  before: readonly unknown[],
  after: readonly unknown[],
): boolean {
  if (after.length !== before.length) return false;
  return digestRows(before) === digestRows(after);
}

export function fileSizeMb(path: string): number | null {
  try {
    return statSync(path).size / (1024 * 1024);
  } catch {
    return null;
  }
}

/**
 * Measured free disk space in MB via filesystem stats (F3). Returns null
 * when the platform cannot report it — callers treat unknown as warn-level
 * caution, never as proof of space.
 */
export async function measureFreeDiskMb(path: string): Promise<number | null> {
  const { statfs } = await import("node:fs/promises");
  try {
    const stats = await statfs(path);
    const bsize: unknown = stats.bsize;
    const bfree: unknown = stats.bfree;
    if (typeof bsize !== "number" || typeof bfree !== "number") return null;
    if (!Number.isFinite(bsize) || !Number.isFinite(bfree) || bsize <= 0) return null;
    return (bfree * bsize) / (1024 * 1024);
  } catch {
    return null;
  }
}
