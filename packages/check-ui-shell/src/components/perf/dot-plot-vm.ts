// Copyright (c) 2021-2026 Climate Interactive / New Venture Fund

/**
 * View model for a single horizontal dot plot.
 */
export interface DotPlotViewModel {
  /** Raw values of the dots (full set, including any that overflow the visible domain). */
  values: number[]
  /** Raw average value. */
  avg: number
  /** Lower bound of the visible domain (the value at the left tick). */
  min: number
  /** Upper bound of the visible domain (the value at the right tick). */
  max: number
  /** Positions of the in-range dots, in the range [0, 100]. */
  points: number[]
  /** Position of the average line, in the range [0, 100] (clamped). */
  avgPoint: number
  /** Number of samples that exceed the upper bound (rendered as an overflow indicator). */
  overflowCount: number
}

/**
 * Build a `DotPlotViewModel` for the given samples.  Values that exceed `max`
 * are excluded from the rendered dots and counted in `overflowCount` so the
 * caller can display a "tail beyond the visible range" indicator.
 *
 * @param values The raw sample values.
 * @param min The lower bound of the visible domain.
 * @param max The upper bound of the visible domain.
 * @param avg The average value to highlight (clamped to the visible range).
 * @returns A populated dot plot view model.
 */
export function createDotPlotViewModel(values: number[], min: number, max: number, avg: number): DotPlotViewModel {
  const spread = max - min
  function pct(x: number): number {
    if (spread === 0) {
      return 0
    }
    const p = ((x - min) / spread) * 100
    if (p < 0) {
      return 0
    }
    if (p > 100) {
      return 100
    }
    return p
  }

  const points: number[] = []
  let overflowCount = 0
  for (const v of values) {
    if (v > max) {
      overflowCount++
    } else {
      points.push(pct(v))
    }
  }

  return {
    values,
    avg,
    min,
    max,
    points,
    avgPoint: pct(avg),
    overflowCount
  }
}
