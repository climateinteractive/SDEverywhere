// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { DatasetKey, DiffPoint } from '@sdeverywhere/check-core'

export interface TracePointViewModel {
  color: string
  empty?: boolean
  diffPoint?: DiffPoint
}

export interface TraceRowViewModel {
  datasetKey: DatasetKey
  varName: string
  points: TracePointViewModel[]
}
