// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ScenarioKey } from '../_shared/types'
import type { PerfReport } from '../perf/perf-stats'
import type { DiffReport } from './compare-datasets'

export interface CompareDatasetReport {
  scenarioKey: ScenarioKey
  datasetKey: DatasetKey
  diffReport: DiffReport
}

export interface CompareReport {
  datasetReports: CompareDatasetReport[]
  perfReportL: PerfReport
  perfReportR: PerfReport
}
