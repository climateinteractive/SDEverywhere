// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { PerfReport } from '../perf/perf-stats'
import type { DatasetKey, ScenarioKey } from '../_shared/types'
import type { CompareReport } from './compare-report'

/**
 * A simplified/terse version of `CompareDatasetReport` that matches the
 * format of the JSON objects emitted by the CLI in terse mode.
 * The object keys are terse and it only includes the minimum set of fields
 * to keep the file smaller when there are many reported differences.
 */
export interface CompareDatasetSummary {
  /** Short for `scenarioKey`. */
  s: ScenarioKey
  /** Short for `datasetKey`. */
  d: DatasetKey
  /** Short for `maxDiff`. */
  md: number
}

/**
 * A simplified/terse version of `CompareReport` that matches the
 * format of the JSON objects emitted by the CLI in terse mode.
 */
export interface CompareSummary {
  datasetSummaries: CompareDatasetSummary[]
  perfReportL: PerfReport
  perfReportR: PerfReport
}

/**
 * Convert a full `CompareReport` to a simplified `CompareSummary` that includes
 * the minimum set of fields needed to keep the file smaller when there are many
 * reported differences.
 *
 * @param compareReport The full compare report.
 * @return The converted compare summary.
 */
export function compareSummaryFromReport(compareReport: CompareReport): CompareSummary {
  const datasetSummaries: CompareDatasetSummary[] = []

  for (const r of compareReport.datasetReports) {
    if (r.diffReport.validity === 'both' && r.diffReport.maxDiff > 0) {
      datasetSummaries.push({
        s: r.scenarioKey,
        d: r.datasetKey,
        md: r.diffReport.maxDiff
      })
    }
  }

  return {
    datasetSummaries,
    perfReportL: compareReport.perfReportL,
    perfReportR: compareReport.perfReportR
  }
}
