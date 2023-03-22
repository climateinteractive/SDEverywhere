// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  CheckDataCoordinator,
  CheckReport,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonSummary
} from '@sdeverywhere/check-core'

import type { CheckSummaryViewModel } from '../check/summary/check-summary-vm'
import { createCheckSummaryViewModel } from '../check/summary/check-summary-vm'
import type { CompareGraphsViewModel } from '../compare/graphs/compare-graphs-vm'
import { createCompareGraphsViewModel } from '../compare/graphs/compare-graphs-vm'
import type { CompareSummaryViewModel } from '../compare/summary/compare-summary-vm'
import { createCompareSummaryViewModel } from '../compare/summary/compare-summary-vm'
import type { StatsTableViewModel } from '../stats/stats-table-vm'
import { createStatsTableViewModel } from '../stats/stats-table-vm'

export interface SummaryViewModel {
  checkSummaryViewModel: CheckSummaryViewModel
  comparisonSummary?: ComparisonSummary
  compareGraphsViewModel?: CompareGraphsViewModel
  compareSummaryViewModel?: CompareSummaryViewModel
  statsTableViewModel?: StatsTableViewModel
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  comparisonDataCoordinator: ComparisonDataCoordinator,
  checkReport: CheckReport,
  comparisonConfig: ComparisonConfig | undefined,
  comparisonSummary: ComparisonSummary | undefined,
  simplifyScenarios: boolean
): SummaryViewModel {
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)

  let compareGraphsViewModel: CompareGraphsViewModel
  let compareSummaryViewModel: CompareSummaryViewModel
  let statsTableViewModel: StatsTableViewModel
  if (comparisonConfig && comparisonSummary) {
    // const graphSpecsL = compareConfig.bundleL.model.modelSpec.graphSpecs
    // const graphSpecsR = compareConfig.bundleR.model.modelSpec.graphSpecs
    // if (graphSpecsL?.length && graphSpecsR?.length) {
    //   // TODO: Allow for selecting a scenario
    //   const scenario = allInputsAtPositionScenario('at-default')
    //   compareGraphsViewModel = createCompareGraphsViewModel(
    //     compareConfig,
    //     compareDataCoordinator,
    //     scenario,
    //     compareSummary.datasetSummaries
    //   )
    // }

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
    compareGraphsViewModel,
    compareSummaryViewModel,
    statsTableViewModel
  }
}
