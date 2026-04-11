// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { Dataset } from '@sdeverywhere/check-core'

export function mockDataset(delta = 0): Dataset {
  return new Map([
    [2000, 10 + delta],
    [2020, 20 + delta],
    [2040, 80 + delta],
    [2060, 50 + delta],
    [2080, 70 + delta],
    [2100, 100 + delta]
  ])
}
