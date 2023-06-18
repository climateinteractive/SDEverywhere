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
 * @return The converted suite summary.
 */
export function suiteSummaryFromReport(suiteReport: SuiteReport): SuiteSummary {
  // Convert check report to terse form that only includes failed/errored checks
  const checkSummary = checkSummaryFromReport(suiteReport.checkReport)

  // Convert comparison report to terse summaries
  let comparisonSummary: ComparisonSummary
  if (suiteReport.comparisonReport) {
    comparisonSummary = comparisonSummaryFromReport(suiteReport.comparisonReport)
  }

  return {
    checkSummary,
    comparisonSummary
  }
}
