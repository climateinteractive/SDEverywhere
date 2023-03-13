// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckReport } from '../check/check-report'
import type { CompareReport } from '../compare'

export interface SuiteReport {
  checkReport: CheckReport
  compareReport?: CompareReport
}
