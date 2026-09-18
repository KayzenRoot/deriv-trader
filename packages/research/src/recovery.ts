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
 * Verify a compaction: merged row count must equal the summed inputs and the
 * merged content hash must match the hash of concatenated per-file row hashes
 * in input order (order-independent of filesystem listing).
 */
export function verifyCompaction(
  inputRows: number[],
  inputHashes: string[],
  mergedRows: number,
  mergedHash: string,
): boolean {
  const expectedRows = inputRows.reduce((sum, n) => sum + n, 0);
  if (mergedRows !== expectedRows) return false;
  const expectedHash = createHash("sha256").update(inputHashes.join("|"), "utf8").digest("hex");
  return mergedHash === expectedHash;
}

export function fileSizeMb(path: string): number | null {
  try {
    return statSync(path).size / (1024 * 1024);
  } catch {
    return null;
  }
}
