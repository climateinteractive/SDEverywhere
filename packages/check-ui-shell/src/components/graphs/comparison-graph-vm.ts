// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Dataset } from '@sdeverywhere/check-core'

export interface Point {
  x: number
  y: number
}

export type PlotStyle = 'normal' | 'wide' | 'dashed' | 'fill-to-next' | 'fill-above' | 'fill-below'

export interface RefPlot {
  points: Point[]
  style: PlotStyle
}

export interface ComparisonGraphViewModel {
  key: string
  refPlots: RefPlot[]
  pointsL: Point[]
  pointsR: Point[]
  xMin?: number
  xMax?: number
}

/**
 * Convert a `Dataset` to an array of `Point` instances.
 */
export function pointsFromDataset(dataset?: Dataset): Point[] {
  if (!dataset) {
    return []
  }

  // XXX: Chart.js appears to hang if any data point is near -Number.MAX_VALUE,
  // so we will omit the point if we detect a large (positive or negative) value
  const minValue = -Number.MAX_VALUE / 2
  const maxValue = Number.MAX_VALUE / 2

  // TODO: For now we'll assume that the x values are monotonically increasing
  const points: Point[] = []
  for (const [x, y] of dataset.entries()) {
    if (y < minValue || y > maxValue) {
      continue
    }
    points.push({
      x,
      y
    })
  }
  return points
}
