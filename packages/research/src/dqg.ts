/**
 * Data Quality Gate (DT-WP-02 Phase H).
 * Deterministic checks over normalized rows. Critical live-input defects mark
 * data UNTRUSTED (BLOCK_TRADING_INPUT); dataset promotion uses BLOCK_DATASET.
 */
import type { ProposalRow, TickRow } from "./capture.js";

export type DqgSeverity = "INFO" | "WARN" | "BLOCK_DATASET" | "BLOCK_TRADING_INPUT";

export interface DqgFinding {
  readonly check: string;
  readonly severity: DqgSeverity;
  readonly detail: string;
  readonly count: number;
}

export interface DqgOptions {
  readonly maxGapSeconds?: number;
  readonly maxSkewSeconds?: number;
}

export function checkTicks(rows: TickRow[], options: DqgOptions = {}): DqgFinding[] {
  const findings: DqgFinding[] = [];
  const maxGap = options.maxGapSeconds ?? 30;
  const maxSkew = options.maxSkewSeconds ?? 60;
  const seen = new Set<string>();
  let duplicates = 0;
  let nonMonotonic = 0;
  let invalidQuote = 0;
  let gaps = 0;
  let skewed = 0;
  // Arrival order matters: a later arrival carrying an earlier event time is
  // exactly the non-monotonic condition. Never sort before this check.
  let maxEventTime: number | null = null;
  let previous: TickRow | null = null;
  for (const row of rows) {
    const fingerprint = `${row.underlyingSymbol}|${String(row.eventTime)}|${String(row.quote)}`;
    if (seen.has(fingerprint)) duplicates += 1;
    seen.add(fingerprint);
    if (!(row.quote > 0) || !Number.isFinite(row.quote)) invalidQuote += 1;
    if (maxEventTime !== null && row.eventTime < maxEventTime) nonMonotonic += 1;
    maxEventTime = maxEventTime === null ? row.eventTime : Math.max(maxEventTime, row.eventTime);
    if (previous) {
      if (row.eventTime - previous.eventTime > maxGap) gaps += 1;
    }
    const receiveMs = Date.parse(row.receiveTime);
    if (Number.isFinite(receiveMs)) {
      const skewSeconds = Math.abs(receiveMs / 1000 - row.eventTime);
      if (skewSeconds > maxSkew) skewed += 1;
    }
    previous = row;
  }
  if (duplicates > 0) {
    findings.push({ check: "duplicates", severity: "WARN", detail: `${String(duplicates)} duplicate events`, count: duplicates });
  }
  if (nonMonotonic > 0) {
    findings.push({ check: "non-monotonic-time", severity: "BLOCK_DATASET", detail: `${String(nonMonotonic)} out-of-order events`, count: nonMonotonic });
  }
  if (invalidQuote > 0) {
    findings.push({ check: "invalid-quote", severity: "BLOCK_TRADING_INPUT", detail: `${String(invalidQuote)} invalid quotes`, count: invalidQuote });
  }
  if (gaps > 0) {
    findings.push({ check: "gaps", severity: "WARN", detail: `${String(gaps)} gaps over ${String(maxGap)}s`, count: gaps });
  }
  if (skewed > 0) {
    findings.push({ check: "clock-skew", severity: "WARN", detail: `${String(skewed)} skewed receipts`, count: skewed });
  }
  return findings;
}

export function checkProposals(rows: ProposalRow[]): DqgFinding[] {
  const findings: DqgFinding[] = [];
  let invalidEconomics = 0;
  let missingIdentity = 0;
  for (const row of rows) {
    if (!row.underlyingSymbol || !row.contractType || !(row.durationSeconds > 0)) {
      missingIdentity += 1;
      continue;
    }
    if (row.state === "KNOWN") {
      const ok =
        row.askPrice !== null &&
        row.payout !== null &&
        row.askPrice > 0 &&
        row.payout > 0 &&
        row.effectivePayout !== null;
      if (!ok) invalidEconomics += 1;
    }
  }
  if (missingIdentity > 0) {
    findings.push({ check: "missing-contract-identity", severity: "BLOCK_DATASET", detail: `${String(missingIdentity)} rows lack identity`, count: missingIdentity });
  }
  if (invalidEconomics > 0) {
    findings.push({ check: "invalid-economics", severity: "BLOCK_TRADING_INPUT", detail: `${String(invalidEconomics)} KNOWN rows with bad economics`, count: invalidEconomics });
  }
  return findings;
}

/** Partition time-range overlap detection across sibling partitions. */
export function checkPartitionOverlap(
  ranges: { readonly name: string; readonly start: number; readonly end: number }[],
): DqgFinding[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let overlaps = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (previous && current && current.start < previous.end) overlaps += 1;
  }
  if (overlaps === 0) return [];
  return [
    { check: "partition-overlap", severity: "BLOCK_DATASET", detail: `${String(overlaps)} overlapping partitions`, count: overlaps },
  ];
}

export function blocksDataset(findings: DqgFinding[]): boolean {
  return findings.some((f) => f.severity === "BLOCK_DATASET" || f.severity === "BLOCK_TRADING_INPUT");
}
