// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { DatasetKey, DiffPoint } from '@sdeverywhere/check-core'

export interface TracePointViewModel {
  /** Whether there is a difference for this point (will be undefined if there is no data at this time). */
  hasDiff?: boolean
  /** The color of the square. */
  color: string
  /** The diff point, if computed. */
  diffPoint?: DiffPoint
}

export interface TraceRowViewModel {
  datasetKey: DatasetKey
  varName: string
  points: TracePointViewModel[]
}
