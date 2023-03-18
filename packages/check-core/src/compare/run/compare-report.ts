// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { CompareScenarioDefKey } from '../config/compare-scenarios'
import type { PerfReport } from '../../perf/perf-stats'
import type { DiffReport } from './compare-diff-datasets'

export interface CompareDatasetReport {
  scenarioDefKey: CompareScenarioDefKey
  datasetKey: DatasetKey
  diffReport: DiffReport
}

export interface CompareReport {
  datasetReports: CompareDatasetReport[]
  perfReportL: PerfReport
  perfReportR: PerfReport
}
