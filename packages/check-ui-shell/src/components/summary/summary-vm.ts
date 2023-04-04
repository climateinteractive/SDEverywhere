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
  type TabInfo = [subtitle: string, status: string]

  function getTabInfo(diffCount: number, kind: string): TabInfo {
    if (diffCount === 0) {
      return ['all clear', 'passed']
    } else {
      const kindPart = diffCount === 1 ? kind : `${kind}s`
      return [`${diffCount} ${kindPart} with diffs`, 'warning']
    }
  }

  const tabItems: TabItemViewModel[] = []
  function addTabItem(id: string, title: string, tabInfo: TabInfo): void {
    tabItems.push({
      id,
      title,
      subtitle: tabInfo[0],
      subtitleClass: `status-color-${tabInfo[1]}`
    })
  }

  // Always add the check summary tab (if there are no checks defined, it will say "No checks",
  // which is better than having no content at all)
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)
  let checkTabInfo: TabInfo
  if (checkSummaryViewModel.total === 0) {
    checkTabInfo = ['no checks', 'none']
  } else if (checkSummaryViewModel.failed > 0 || checkSummaryViewModel.errors > 0) {
    const parts: string[] = []
    if (checkSummaryViewModel.failed > 0) {
      parts.push(`${checkSummaryViewModel.failed} failed`)
    }
    if (checkSummaryViewModel.errors > 0) {
      if (checkSummaryViewModel.errors === 1) {
        parts.push(`${checkSummaryViewModel.errors} error`)
      } else {
        parts.push(`${checkSummaryViewModel.errors} errors`)
      }
    }
    checkTabInfo = [parts.join(', '), 'failed']
  } else {
    checkTabInfo = ['all clear', 'passed']
  }
  addTabItem('checks', 'Checks', checkTabInfo)

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

      // For now, if we have an "all graphs" view, report the number of changed graphs.  If no graph differences, report
      // the number of views (scenarios) with differences.
      let viewsTabInfo: TabInfo
      const allViewRows = comparisonSummaries.views.allRows
      const allGraphsRow = allViewRows.find(row => row.viewMetadata?.view.graphs === 'all')
      const changedGraphCount = allGraphsRow?.viewMetadata?.changedGraphCount || 0
      if (changedGraphCount > 0) {
        viewsTabInfo = getTabInfo(changedGraphCount, 'graph')
      } else {
        viewsTabInfo = getTabInfo(comparisonViewsSummaryViewModel.rowsWithDiffs, 'view')
      }
      addTabItem('comp-views', 'Comparison views', viewsTabInfo)
    }

    // Add tab for by-scenario summaries
    comparisonsByScenarioSummaryViewModel = comparisonSummaries.byScenario
    const byScenarioTabInfo = getTabInfo(comparisonsByScenarioSummaryViewModel.rowsWithDiffs, 'scenario')
    addTabItem('comps-by-scenario', 'Comparisons by scenario', byScenarioTabInfo)

    // Add tab for by-dataset summaries
    comparisonsByDatasetSummaryViewModel = comparisonSummaries.byDataset
    const byDatasetTabInfo = getTabInfo(comparisonsByDatasetSummaryViewModel.rowsWithDiffs, 'dataset')
    addTabItem('comps-by-dataset', 'Comparisons by output', byDatasetTabInfo)
  }

  // Select the first tab that has differences by default; if no differences, show the
  // first ("Checks") tab by default
  const initialTabIndex = tabItems.findIndex(item => item.subtitle !== 'all clear')
  const tabBarViewModel = new TabBarViewModel(tabItems, initialTabIndex >= 0 ? initialTabIndex : 0)

  return {
    statsTableViewModel,
    tabBarViewModel,
    checkSummaryViewModel,
    comparisonViewsSummaryViewModel,
    comparisonsByScenarioSummaryViewModel,
    comparisonsByDatasetSummaryViewModel
  }
}
