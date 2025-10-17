// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { get } from 'svelte/store'

import type {
  CheckDataCoordinator,
  CheckReport,
  ComparisonConfig,
  ComparisonSummary,
  ComparisonScenarioTitleSpec
} from '@sdeverywhere/check-core'

import type { CheckSummaryViewModel } from '../check/summary/check-summary-vm'
import { createCheckSummaryViewModel } from '../check/summary/check-summary-vm'
import type { PinnedItemStates } from '../compare/_shared/pinned-item-state'
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
  comparisonSummary?: ComparisonSummary
  comparisonViewsSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByScenarioSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByDatasetSummaryViewModel?: ComparisonSummaryViewModel
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport,
  comparisonConfig: ComparisonConfig | undefined,
  comparisonSummary: ComparisonSummary | undefined,
  pinnedItemStates: PinnedItemStates,
  skipComparisonScenarios: ComparisonScenarioTitleSpec[] = []
): SummaryViewModel {
  type TabInfo = [subtitle: string, status: string]

  function getTabInfo(diffCount: number, kind: string, skippedCount: number = 0): TabInfo {
    if (diffCount === 0) {
      if (skippedCount === 0) {
        // There are no diffs and no skipped items
        return ['all clear', 'passed']
      } else {
        // There are no diffs, but there are skipped items
        let kindPart: string
        if (kind === 'dataset') {
          kindPart = skippedCount === 1 ? 'scenario' : 'scenarios'
        } else {
          kindPart = skippedCount === 1 ? kind : `${kind}s`
        }
        return [`no diffs, but ${skippedCount} skipped ${kindPart}`, 'warning']
      }
    } else {
      // There are diffs
      // TODO: For now we say "diffs" even though some might be errors
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
    // Show passed count, and skipped count if there are any
    const parts: string[] = []
    let status = 'passed'
    if (checkSummaryViewModel.passed > 0) {
      parts.push(`${checkSummaryViewModel.passed} passed`)
    }
    if (checkSummaryViewModel.skipped > 0) {
      parts.push(`${checkSummaryViewModel.skipped} skipped`)
      status = 'warning'
    }
    checkTabInfo = [parts.join(', '), status]
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
    const comparisonSummaries = createComparisonSummaryViewModels(
      comparisonConfig,
      pinnedItemStates,
      comparisonSummary.testSummaries,
      skipComparisonScenarios
    )

    // Add tab for comparison views, if some are defined
    if (comparisonSummaries.views) {
      comparisonViewsSummaryViewModel = comparisonSummaries.views

      // For now, if we have one or more views that show graphs grouped by diffs, report the
      // number of changed graphs.  If no graph differences, report the number of views
      // (scenarios) with differences.
      let viewsTabInfo: TabInfo
      let changedGraphCount = 0
      for (const row of get(comparisonSummaries.views.allRows)) {
        // TODO: We may end up counting the same graph here multiple times if there are multiple
        // views that use "grouped-by-diffs" mode and display the same subset of graphs in each.
        // Ideally we would get the number of unique graphs with changes here instead.
        const view = row.viewMetadata?.view
        if (view?.kind === 'view' && view.graphOrder === 'grouped-by-diffs') {
          changedGraphCount += row?.viewMetadata?.changedGraphCount || 0
        }
      }
      if (changedGraphCount > 0) {
        viewsTabInfo = getTabInfo(changedGraphCount, 'graph')
      } else {
        viewsTabInfo = getTabInfo(comparisonViewsSummaryViewModel.rowsWithDiffs, 'view')
      }
      addTabItem('comp-views', 'Comparison views', viewsTabInfo)
    }

    // Add tab for by-scenario summaries
    comparisonsByScenarioSummaryViewModel = comparisonSummaries.byScenario
    const byScenarioTabInfo = getTabInfo(
      comparisonsByScenarioSummaryViewModel.rowsWithDiffs,
      'scenario',
      comparisonSummaries.skippedScenariosCount
    )
    addTabItem('comps-by-scenario', 'Comparisons by scenario', byScenarioTabInfo)

    // Add tab for by-dataset summaries
    comparisonsByDatasetSummaryViewModel = comparisonSummaries.byDataset
    const byDatasetTabInfo = getTabInfo(
      comparisonsByDatasetSummaryViewModel.rowsWithDiffs,
      'dataset',
      comparisonSummaries.skippedScenariosCount
    )
    addTabItem('comps-by-dataset', 'Comparisons by dataset', byDatasetTabInfo)
  }

  // Select the first tab that has differences by default; if no differences, show the
  // first ("Checks") tab by default
  const initialTabIndex = tabItems.findIndex(item => item.subtitle !== 'all clear')
  const tabBarViewModel = new TabBarViewModel(tabItems, initialTabIndex >= 0 ? initialTabIndex : 0)

  return {
    statsTableViewModel,
    tabBarViewModel,
    checkSummaryViewModel,
    comparisonSummary,
    comparisonViewsSummaryViewModel,
    comparisonsByScenarioSummaryViewModel,
    comparisonsByDatasetSummaryViewModel
  }
}
