// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { checkSummaryFromReport } from '../check/check-summary'

import type { ComparisonSummary } from '../comparison/report/comparison-report-types'
import { comparisonSummaryFromReport } from '../comparison/report/comparison-reporting'

import type { SuiteReport, SuiteSummary } from './suite-report-types'

/**
 * Convert a full `SuiteReport` to a simplified `SuiteSummary` that only includes
 * failed/errored checks or comparisons with differences.
 *
 * @param suiteReport The full suite report.
 * @param elapsedMillis The time in milliseconds that it took to run the suite.
 * @return The converted suite summary.
 */
export function suiteSummaryFromReport(suiteReport: SuiteReport, elapsedMillis: number): SuiteSummary {
  // Convert check report to terse form that only includes failed/errored checks
  const checkSummary = checkSummaryFromReport(suiteReport.checkReport)

  // Convert comparison report to terse summaries
  let comparisonSummary: ComparisonSummary
  if (suiteReport.comparisonReport) {
    comparisonSummary = comparisonSummaryFromReport(suiteReport.comparisonReport)
  }

  // Get the current date and time in ISO 8601 format
  const date = new Date().toISOString()

  return {
    date,
    elapsed: elapsedMillis,
    checkSummary,
    comparisonSummary
  }
}
