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

export interface WalkForwardWindow {
  readonly fold: number;
  readonly train: TimeRange;
  readonly validation: TimeRange;
  readonly test: TimeRange;
}

/**
 * Build rolling train/validation/test windows inside a pre-test range. The
 * caller owns the final sealed range; this helper never crosses its `end`.
 */
export function rollingWalkForward(
  start: number,
  end: number,
  trainFraction = 0.375,
  validationFraction = 0.25,
  testFraction = 0.25,
  stepFraction = 0.125,
): readonly WalkForwardWindow[] {
  if (!(end > start)) throw new Error("walk-forward needs a positive range");
  if ([trainFraction, validationFraction, testFraction, stepFraction].some((value) => value <= 0)) {
    throw new Error("walk-forward fractions must be positive");
  }
  const span = end - start;
  const trainSpan = Math.max(1, Math.floor(span * trainFraction));
  const validationSpan = Math.max(1, Math.floor(span * validationFraction));
  const testSpan = Math.max(1, Math.floor(span * testFraction));
  const step = Math.max(1, Math.floor(span * stepFraction));
  const windows: WalkForwardWindow[] = [];
  for (let cursor = start; cursor + trainSpan + validationSpan + testSpan <= end; cursor += step) {
    const train = { start: cursor, end: cursor + trainSpan };
    const validation = { start: train.end, end: train.end + validationSpan };
    const test = { start: validation.end, end: validation.end + testSpan };
    if (!overlaps(train, validation) && !overlaps(train, test) && !overlaps(validation, test)) {
      windows.push({ fold: windows.length + 1, train, validation, test });
    }
  }
  return windows;
}

export type FoldName = "dev" | "validation" | "test";

export type ResearchAccess = "search" | "measure" | "sensitivity" | "calibration";

/**
 * A fold-scoped capability is the only authority accepted by research
 * operations.  The fold is data, not a caller-provided advisory label: the
 * capability is created by the split owner and carries the research cycle.
 */
export interface ResearchCapability {
  readonly cycleVersion: string;
  readonly fold: FoldName;
  readonly access: ResearchAccess;
}

export function capabilityFor(
  cycleVersion: string,
  fold: FoldName,
  access: ResearchAccess,
): ResearchCapability {
  if (!cycleVersion) throw new Error("research capability needs a cycle version");
  if (fold === "test" && access !== "measure") {
    throw new Error(`final-test ${access} capability is forbidden`);
  }
  return Object.freeze({ cycleVersion, fold, access });
}

export function assertCapability(
  capability: ResearchCapability,
  expected: { readonly fold: FoldName; readonly access: ResearchAccess },
): void {
  if (capability.fold !== expected.fold || capability.access !== expected.access) {
    throw new Error(
      `research capability mismatch: expected ${expected.fold}/${expected.access}, got ${capability.fold}/${capability.access}`,
    );
  }
}

function requirePreTest(capability: ResearchCapability, access: "search" | "calibration"): void {
  if (capability.fold === "test" || capability.access !== access) {
    throw new Error(`final-test ${access} capability is forbidden`);
  }
}

export function searchWithCapability<T>(capability: ResearchCapability, fn: () => T): T {
  requirePreTest(capability, "search");
  return fn();
}

export function calibrateWithCapability<T>(capability: ResearchCapability, fn: () => T): T {
  requirePreTest(capability, "calibration");
  return fn();
}

export function measureWithCapability<T>(capability: ResearchCapability, fn: () => T): T {
  if (capability.access !== "measure") {
    throw new Error(`measurement requires a measure capability, got ${capability.access}`);
  }
  return fn();
}

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

  /** Code-level capability for read-only final-test measurement. */
  measurementCapability(cycleVersion: string): ResearchCapability {
    if (!this.sealed) throw new Error("final-test measurement requires a sealed lock");
    return capabilityFor(cycleVersion, "test", "measure");
  }

  /** Explicitly rejected final-test search/calibration surface. */
  searchCapability(cycleVersion: string, access: Exclude<ResearchAccess, "measure">): ResearchCapability {
    if (this.sealed) throw new Error(`final-test ${access} capability is forbidden`);
    return capabilityFor(cycleVersion, "test", access);
  }

  contains(timestamp: number): boolean {
    return timestamp >= this.range.start && timestamp < this.range.end;
  }
}
