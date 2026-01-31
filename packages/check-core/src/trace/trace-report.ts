// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../_shared/types'
import type { DiffValidity, DiffPoint } from '../comparison/diff-datasets/diff-datasets'

/**
 * The report for a single trace comparison between two datasets.
 *
 * TODO: This is basically the same as `DiffReport`, except that it preserves the
 * diff points.  Maybe we can combine them and make the points array an opt-in thing.
 */
export interface TraceDatasetReport {
  datasetKey: DatasetKey
  validity: DiffValidity
  points: Map<number, DiffPoint>
  minValue: number
  maxValue: number
  avgDiff: number
  minDiff: number
  maxDiff: number
  maxDiffPoint: DiffPoint
}

/**
 * The roll-up report that contains the results of the trace comparisons
 * for all datasets.
 */
export interface TraceReport {
  datasetReports: Map<DatasetKey, TraceDatasetReport>
}
