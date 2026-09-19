/**
 * Chronological splits and final-test lock (DT-WP-03 §15).
 * Dev/validation/test ranges can never overlap; the final test partition is
 * read-only for acceptance measurement, and tuning against it is rejected at
 * the code level (tuning must open a new research cycle/version instead).
 */
export interface TimeRange {
  readonly start: number;
  readonly end: number;
}

export interface ChronologicalSplit {
  readonly dev: TimeRange;
  readonly validation: TimeRange;
  readonly test: TimeRange;
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Split [start, end) into dev/validation/test fractions in order. */
export function chronologicalSplit(
  start: number,
  end: number,
  devFraction = 0.6,
  validationFraction = 0.2,
): ChronologicalSplit {
  if (!(end > start)) throw new Error("split needs a positive range");
  if (devFraction <= 0 || validationFraction <= 0 || devFraction + validationFraction >= 1) {
    throw new Error("split fractions must be positive with room for a test fold");
  }
  const span = end - start;
  const devEnd = start + Math.floor(span * devFraction);
  const validationEnd = devEnd + Math.floor(span * validationFraction);
  const split = {
    dev: { start, end: devEnd },
    validation: { start: devEnd, end: validationEnd },
    test: { start: validationEnd, end },
  };
  if (overlaps(split.dev, split.validation) || overlaps(split.dev, split.test) || overlaps(split.validation, split.test)) {
    throw new Error("split construction produced overlapping folds");
  }
  return split;
}

export type FoldName = "dev" | "validation" | "test";

export function foldOf(split: ChronologicalSplit, timestamp: number): FoldName | null {
  if (timestamp >= split.dev.start && timestamp < split.dev.end) return "dev";
  if (timestamp >= split.validation.start && timestamp < split.validation.end) return "validation";
  if (timestamp >= split.test.start && timestamp < split.test.end) return "test";
  return null;
}

/**
 * Final-test lock: seals the untouched range. Any tuning/search/calibration
 * attempt scoped to it throws; measurement reads are allowed.
 */
export class FinalTestLock {
  private readonly range: TimeRange;
  private sealed = false;

  constructor(range: TimeRange) {
    this.range = range;
  }

  seal(): void {
    this.sealed = true;
  }

  isSealed(): boolean {
    return this.sealed;
  }

  /** Read-only acceptance measurement entrypoint (always allowed). */
  measure<T>(fn: () => T): T {
    return fn();
  }

  /** Tuning/search entrypoint: rejected once sealed. */
  tune<T>(label: string, fn: () => T): T {
    if (this.sealed) {
      throw new Error(`final-test tuning rejected (${label}): open a new research cycle instead`);
    }
    return fn();
  }

  contains(timestamp: number): boolean {
    return timestamp >= this.range.start && timestamp < this.range.end;
  }
}
