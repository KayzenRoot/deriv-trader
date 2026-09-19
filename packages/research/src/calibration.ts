/**
 * Calibration framework (DT-WP-03 §13).
 * Transparent deterministic reliability-bin calibration fit ONLY on allowed
 * chronological folds. Insufficient evidence yields p_hat = null — quality
 * scores are never converted into fake probabilities.
 */
export interface CalibrationSample {
  readonly score: number;
  readonly won: boolean;
}

export interface ReliabilityBucket {
  readonly low: number;
  readonly high: number;
  readonly count: number;
  readonly empiricalRate: number | null;
}

export interface CalibrationResult {
  readonly adequate: boolean;
  readonly samples: number;
  readonly buckets: ReliabilityBucket[];
  readonly brier: number | null;
  readonly logLoss: number | null;
  readonly slope: number | null;
  readonly intercept: number | null;
  readonly reason: string;
}

export interface CalibrationOptions {
  readonly buckets?: number;
  readonly minSamples?: number;
  readonly minPerBucket?: number;
}

/** Map a quality score through fitted buckets; null when uncalibrated. */
export function calibrateScore(
  result: CalibrationResult,
  score: number,
): number | null {
  if (!result.adequate) return null;
  for (const bucket of result.buckets) {
    if (score >= bucket.low && (score < bucket.high || bucket.high >= 1)) {
      return bucket.empiricalRate;
    }
  }
  return null;
}

export function fitCalibration(
  samples: readonly CalibrationSample[],
  options: CalibrationOptions = {},
): CalibrationResult {
  const bucketCount = options.buckets ?? 5;
  const minSamples = options.minSamples ?? 100;
  const minPerBucket = options.minPerBucket ?? 20;
  if (samples.length < minSamples) {
    return {
      adequate: false,
      samples: samples.length,
      buckets: [],
      brier: null,
      logLoss: null,
      slope: null,
      intercept: null,
      reason: `insufficient samples (${String(samples.length)} < ${String(minSamples)})`,
    };
  }
  const buckets: ReliabilityBucket[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const low = i / bucketCount;
    const high = (i + 1) / bucketCount;
    const inBucket = samples.filter((s) => s.score >= low && (s.score < high || high >= 1));
    buckets.push({
      low,
      high,
      count: inBucket.length,
      empiricalRate: inBucket.length >= minPerBucket ? inBucket.filter((s) => s.won).length / inBucket.length : null,
    });
  }
  if (buckets.some((b) => b.empiricalRate === null)) {
    return {
      adequate: false,
      samples: samples.length,
      buckets,
      brier: null,
      logLoss: null,
      slope: null,
      intercept: null,
      reason: "sparse buckets below minimum density",
    };
  }
  let brierSum = 0;
  let logLossSum = 0;
  let validLogLoss = true;
  for (const sample of samples) {
    const p = calibrateScore({ adequate: true, samples: 0, buckets, brier: null, logLoss: null, slope: null, intercept: null, reason: "" }, sample.score) ?? 0.5;
    brierSum += (p - (sample.won ? 1 : 0)) ** 2;
    const clipped = Math.min(1 - 1e-9, Math.max(1e-9, p));
    logLossSum += sample.won ? -Math.log(clipped) : -Math.log(1 - clipped);
    if (!Number.isFinite(logLossSum)) validLogLoss = false;
  }
  // Calibration slope/intercept via bucket midpoints vs empirical rates.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const bucket of buckets) {
    if (bucket.empiricalRate === null) continue;
    xs.push((bucket.low + bucket.high) / 2);
    ys.push(bucket.empiricalRate);
  }
  const xMean = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const yMean = ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += ((xs[i] ?? 0) - xMean) * ((ys[i] ?? 0) - yMean);
    den += ((xs[i] ?? 0) - xMean) ** 2;
  }
  const slope = den === 0 ? null : num / den;
  return {
    adequate: true,
    samples: samples.length,
    buckets,
    brier: brierSum / samples.length,
    logLoss: validLogLoss ? logLossSum / samples.length : null,
    slope,
    intercept: slope === null ? null : yMean - slope * xMean,
    reason: "fitted on allowed folds",
  };
}
