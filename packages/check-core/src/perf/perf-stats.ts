// Copyright (c) 2021-2026 Climate Interactive / New Venture Fund

/**
 * A summary of timing samples collected during a performance run.
 */
export interface PerfReport {
  /** Minimum sample time, in milliseconds. */
  readonly minTime: number
  /** Maximum sample time, in milliseconds. */
  readonly maxTime: number
  /**
   * Trimmed mean (interquartile mean) computed from the middle 50% of samples,
   * in milliseconds.  This is more robust against outliers than a simple mean.
   */
  readonly avgTime: number
  /** Median (50th percentile) sample time, in milliseconds. */
  readonly medianTime: number
  /** 95th percentile sample time, in milliseconds. */
  readonly p95Time: number
  /** Population standard deviation across all samples, in milliseconds. */
  readonly stdDev: number
  /** All recorded sample times, sorted ascending, in milliseconds. */
  readonly allTimes: number[]
}

/**
 * Return the linearly-interpolated percentile of the given sorted array.
 *
 * @param sorted The samples sorted in ascending order.  Must be non-empty.
 * @param p The percentile to compute, in the range [0, 1].
 * @returns The interpolated percentile value.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) {
    return sorted[0]
  }
  const rank = p * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) {
    return sorted[lo]
  }
  const frac = rank - lo
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac
}

/**
 * Collect performance timing samples and produce a robust statistical summary.
 */
export class PerfStats {
  private readonly times: number[] = []

  /**
   * Record a single run time sample.
   *
   * @param timeInMillis The run time in milliseconds.
   */
  addRun(timeInMillis: number): void {
    this.times.push(timeInMillis)
  }

  /**
   * Get the raw run time samples that have been recorded.
   *
   * @returns A copy of the recorded run times, in insertion order.
   */
  getTimes(): number[] {
    return this.times.slice()
  }

  /**
   * Produce a `PerfReport` summarizing the recorded samples.
   *
   * @returns The summary report.
   */
  toReport(): PerfReport {
    if (this.times.length === 0) {
      return {
        minTime: 0,
        maxTime: 0,
        avgTime: 0,
        medianTime: 0,
        p95Time: 0,
        stdDev: 0,
        allTimes: []
      }
    }

    // Sort the samples ascending for percentile and trimmed-mean calculations
    const sortedTimes = this.times.slice().sort((a, b) => a - b)
    const n = sortedTimes.length

    // Raw min/max
    const minTime = sortedTimes[0]
    const maxTime = sortedTimes[n - 1]

    // Trimmed mean across the middle 50% of samples (interquartile mean).
    // This matches the historical behavior of `avgTime`.
    const minIndex = Math.floor(n / 4)
    const maxIndex = minIndex + Math.max(1, Math.ceil(n / 2))
    const middleTimes = sortedTimes.slice(minIndex, maxIndex)
    const avgTime = middleTimes.reduce((a, b) => a + b, 0) / middleTimes.length

    // Robust quantiles
    const medianTime = percentile(sortedTimes, 0.5)
    const p95Time = percentile(sortedTimes, 0.95)

    // Population standard deviation across all samples
    const mean = sortedTimes.reduce((a, b) => a + b, 0) / n
    const variance = sortedTimes.reduce((acc, t) => acc + (t - mean) * (t - mean), 0) / n
    const stdDev = Math.sqrt(variance)

    return {
      minTime,
      maxTime,
      avgTime,
      medianTime,
      p95Time,
      stdDev,
      allTimes: sortedTimes
    }
  }
}
