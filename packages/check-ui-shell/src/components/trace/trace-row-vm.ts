// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { DiffPoint } from '@sdeverywhere/check-core'

export interface TracePointViewModel {
  color: string
  empty?: boolean
  diffPoint?: DiffPoint
}

export interface TraceRowViewModel {
  varName: string
  points: TracePointViewModel[]
}
