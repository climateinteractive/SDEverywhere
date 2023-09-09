// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { PerfReport } from '../../perf/perf-stats'
import type { DatasetKey } from '../../_shared/types'
import type { ComparisonScenarioKey } from '../_shared/comparison-resolved-types'
import type { DiffReport } from '../diff-datasets/diff-datasets'

/**
 * The report for a single comparison test (involving a dataset produced under
 * a specific input scenario).  This includes the full `DiffReport`, whereas
 * a `ComparisonTestSummary` only includes the `maxDiff` value.
 */
export interface ComparisonTestReport {
  scenarioKey: ComparisonScenarioKey
  datasetKey: DatasetKey
  diffReport: DiffReport
}

/**
 * A simplified/terse version of `ComparisonTestReport` that is used when writing
 * results to a JSON file.  The object keys are terse and it only includes the
 * minimum set of fields (only the `maxDiff` value instead of the full `DiffReport`)
 * to keep the file smaller when there are many reported differences.
 */
export interface ComparisonTestSummary {
  /** Short for `scenarioKey`. */
  s: ComparisonScenarioKey
  /** Short for `datasetKey`. */
  d: DatasetKey
  /** Short for `maxDiff`. */
  md: number
}

/**
 * The roll-up report that contains the results of all individual comparison tests.
 */
export interface ComparisonReport {
  /** The set of all comparison test reports. */
  testReports: ComparisonTestReport[]
  /** The perf report for the "left" model. */
  perfReportL: PerfReport
  /** The perf report for the "right" model. */
  perfReportR: PerfReport
}

/**
 * A simplified/terse version of `ComparisonReport` that only includes the minimum set
 * of fields needed by the reporting app (to keep the file smaller when there are many
 * reported differences).  This only includes comparison results for which there is
 * a non-zero `maxDiff` value.
 */
export interface ComparisonSummary {
  /** The simplified set of all terse comparison test summaries. */
  testSummaries: ComparisonTestSummary[]
  /** The perf report for the "left" model. */
  perfReportL: PerfReport
  /** The perf report for the "right" model. */
  perfReportR: PerfReport
}
