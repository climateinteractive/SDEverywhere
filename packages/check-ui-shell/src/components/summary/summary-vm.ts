// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  CheckDataCoordinator,
  CheckReport,
  CompareConfig,
  CompareDataCoordinator,
  CompareSummary
} from '@sdeverywhere/check-core'
import { allInputsAtPositionScenario } from '@sdeverywhere/check-core'
import { groupedReportsFromSummaries } from '../../model/reports'
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
  compareSummary?: CompareSummary
  compareGraphsViewModel?: CompareGraphsViewModel
  compareSummaryViewModel?: CompareSummaryViewModel
  statsTableViewModel?: StatsTableViewModel
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  compareDataCoordinator: CompareDataCoordinator,
  checkReport: CheckReport,
  compareConfig: CompareConfig | undefined,
  compareSummary: CompareSummary | undefined,
  simplifyScenarios: boolean
): SummaryViewModel {
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)

  let compareGraphsViewModel: CompareGraphsViewModel
  let compareSummaryViewModel: CompareSummaryViewModel
  let statsTableViewModel: StatsTableViewModel
  if (compareConfig && compareSummary) {
    const graphSpecsL = compareConfig.bundleL.model.modelSpec.graphSpecs
    const graphSpecsR = compareConfig.bundleR.model.modelSpec.graphSpecs
    if (graphSpecsL?.length && graphSpecsR?.length) {
      // TODO: Allow for selecting a scenario
      const scenario = allInputsAtPositionScenario('at-default')
      compareGraphsViewModel = createCompareGraphsViewModel(
        compareConfig,
        compareDataCoordinator,
        scenario,
        compareSummary.datasetSummaries
      )
    }

    const groupedReports = groupedReportsFromSummaries(compareConfig, compareSummary, simplifyScenarios)
    compareSummaryViewModel = createCompareSummaryViewModel(compareConfig, groupedReports, compareGraphsViewModel)
    statsTableViewModel = createStatsTableViewModel(
      compareConfig,
      compareSummary.perfReportL,
      compareSummary.perfReportR
    )
  }

  return {
    checkSummaryViewModel,
    compareSummary,
    compareGraphsViewModel,
    compareSummaryViewModel,
    statsTableViewModel
  }
}
