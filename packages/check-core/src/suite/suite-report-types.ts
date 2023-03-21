// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { CheckReport } from '../check/check-report'
import type { CheckSummary } from '../check/check-summary'
import type { ComparisonReport, ComparisonSummary } from '../compare/run/comparison-report-types'

/**
 * The report for a single run of the full check+comparison test suite.
 */
export interface SuiteReport {
  checkReport: CheckReport
  comparisonReport?: ComparisonReport
}

/**
 * A simplified/terse version of `SuiteReport` that is used when writing
 * results to a JSON file.  The object keys are terse and it only includes
 * the minimum set of fields (e.g., only the `maxDiff` value instead of the
 * full `DiffReport` for each comparison test) to keep the file smaller
 * when there are many reported differences.
 */
export interface SuiteSummary {
  checkSummary: CheckSummary
  comparisonSummary?: ComparisonSummary
}
