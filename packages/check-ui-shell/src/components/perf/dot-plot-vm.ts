// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export interface DotPlotViewModel {
  /** Raw values of the dots. */
  values: number[]
  /** Raw average value. */
  avg: number
  /** Positions of the dots, in the range [0, 100]. */
  points: number[]
  /** Position of the average line, in the range [0, 100]. */
  avgPoint: number
}

export function createDotPlotViewModel(values: number[], min: number, max: number, avg: number): DotPlotViewModel {
  // Convert raw values to percentages
  const spread = max - min
  function pct(x: number): number {
    if (spread !== 0) {
      return ((x - min) / (max - min)) * 100
    } else {
      return 0
    }
  }
  return {
    values,
    avg,
    points: values.map(p => pct(p)),
    avgPoint: pct(avg)
  }
}
