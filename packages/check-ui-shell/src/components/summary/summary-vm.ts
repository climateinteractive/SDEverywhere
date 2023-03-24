// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDataCoordinator, CheckReport, ComparisonConfig, ComparisonSummary } from '@sdeverywhere/check-core'

import type { CheckSummaryViewModel } from '../check/summary/check-summary-vm'
import { createCheckSummaryViewModel } from '../check/summary/check-summary-vm'
import type { ComparisonSummaryViewModel } from '../compare/summary/comparison-summary-vm'
import { createComparisonSummaryViewModels } from '../compare/summary/comparison-summary-vm'
import type { StatsTableViewModel } from '../stats/stats-table-vm'
import { createStatsTableViewModel } from '../stats/stats-table-vm'
import type { TabItemViewModel } from './tab-bar-vm'
import { TabBarViewModel } from './tab-bar-vm'

export interface SummaryViewModel {
  statsTableViewModel?: StatsTableViewModel
  tabBarViewModel: TabBarViewModel
  checkSummaryViewModel: CheckSummaryViewModel
  comparisonViewsSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByScenarioSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByDatasetSummaryViewModel?: ComparisonSummaryViewModel
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport,
  comparisonConfig: ComparisonConfig | undefined,
  comparisonSummary: ComparisonSummary | undefined
): SummaryViewModel {
  const tabItems: TabItemViewModel[] = []
  function addTabItem(id: string, title: string, subtitle: string, status: string): void {
    tabItems.push({
      id,
      title,
      subtitle,
      subtitleClass: `status-color-${status}`
    })
  }

  // Always add the check summary tab (if there are no checks defined, it will say "No checks",
  // which is better than having no content at all)
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)
  addTabItem('checks', 'Checks', '4 failed', 'failed')

  // Add stats header and comparison tabs, if comparison tests are defined
  let statsTableViewModel: StatsTableViewModel
  let comparisonViewsSummaryViewModel: ComparisonSummaryViewModel
  let comparisonsByScenarioSummaryViewModel: ComparisonSummaryViewModel
  let comparisonsByDatasetSummaryViewModel: ComparisonSummaryViewModel
  if (comparisonConfig && comparisonSummary) {
    // Add stats header
    statsTableViewModel = createStatsTableViewModel(
      comparisonConfig,
      comparisonSummary.perfReportL,
      comparisonSummary.perfReportR
    )

    // Create comparison summary view models
    const comparisonSummaries = createComparisonSummaryViewModels(comparisonConfig, comparisonSummary.testSummaries)

    // Add tab for comparison views, if some are defined
    if (comparisonSummaries.views) {
      comparisonViewsSummaryViewModel = comparisonSummaries.views
      addTabItem('comp-views', 'Comparison views', '5 changed graphs', 'warning')
    }

    // Add tab for by-scenario summaries
    comparisonsByScenarioSummaryViewModel = comparisonSummaries.byScenario
    addTabItem('comps-by-scenario', 'Comparisons by scenario', '4 scenarios with diffs', 'warning')

    comparisonsByDatasetSummaryViewModel = comparisonSummaries.byDataset
    addTabItem('comps-by-dataset', 'Comparisons by output', 'all clear', 'passed')
  }

  const tabBarViewModel = new TabBarViewModel(tabItems)

  return {
    statsTableViewModel,
    tabBarViewModel,
    checkSummaryViewModel,
    comparisonViewsSummaryViewModel,
    comparisonsByScenarioSummaryViewModel,
    comparisonsByDatasetSummaryViewModel
  }
}
