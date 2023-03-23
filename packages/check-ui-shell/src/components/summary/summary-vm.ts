// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDataCoordinator, CheckReport, ComparisonConfig, ComparisonSummary } from '@sdeverywhere/check-core'

import type { CheckSummaryViewModel } from '../check/summary/check-summary-vm'
import { createCheckSummaryViewModel } from '../check/summary/check-summary-vm'
import type { CompareSummaryViewModel } from '../compare/summary/compare-summary-vm'
import { createCompareSummaryViewModel } from '../compare/summary/compare-summary-vm'
import type { StatsTableViewModel } from '../stats/stats-table-vm'
import { createStatsTableViewModel } from '../stats/stats-table-vm'

export interface SummaryViewModel {
  checkSummaryViewModel: CheckSummaryViewModel
  comparisonSummary?: ComparisonSummary
  compareSummaryViewModel?: CompareSummaryViewModel
  statsTableViewModel?: StatsTableViewModel
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport,
  comparisonConfig: ComparisonConfig | undefined,
  comparisonSummary: ComparisonSummary | undefined,
  simplifyScenarios: boolean
): SummaryViewModel {
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)

  let compareSummaryViewModel: CompareSummaryViewModel
  let statsTableViewModel: StatsTableViewModel
  if (comparisonConfig && comparisonSummary) {
    compareSummaryViewModel = createCompareSummaryViewModel(comparisonConfig, comparisonSummary.testSummaries)
    statsTableViewModel = createStatsTableViewModel(
      comparisonConfig,
      comparisonSummary.perfReportL,
      comparisonSummary.perfReportR
    )
  }

  return {
    checkSummaryViewModel,
    comparisonSummary,
    compareSummaryViewModel,
    statsTableViewModel
  }
}
