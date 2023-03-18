// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckSummary } from '../check/check-summary'
import { checkSummaryFromReport } from '../check/check-summary'

import type { CompareSummary } from '../compare'
import { compareSummaryFromReport } from '../compare'

import type { SuiteReport } from './suite-report'

/**
 * A simplified/terse version of `SuiteReport` that matches the
 * format of the JSON objects emitted by the CLI in terse mode.
 */
export interface SuiteSummary {
  checkSummary: CheckSummary
  compareSummary?: CompareSummary
}

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

  // Convert compare report to terse summaries
  // TODO: For now we output "terse" JSON that contains just the ScenarioDefKey,
  // DatasetKey, and score (maxDiff) for each scenario, since this is all the
  // app needs.  Later we should add different reporting modes.
  let compareSummary: CompareSummary
  if (suiteReport.compareReport) {
    compareSummary = compareSummaryFromReport(suiteReport.compareReport)
  }

  return {
    checkSummary,
    compareSummary
  }
}
