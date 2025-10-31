// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable } from 'svelte/store'
import { derived, get, writable } from 'svelte/store'

import type {
  CheckDataCoordinator,
  CheckReport,
  ComparisonConfig,
  ComparisonSortMode,
  ComparisonSummary,
  ComparisonScenarioTitleSpec,
  ComparisonTestSummary,
  DatasetKey
} from '@sdeverywhere/check-core'

import type { CheckSummaryViewModel } from '../check/summary/check-summary-vm'
import { createCheckSummaryViewModel } from '../check/summary/check-summary-vm'
import type { PinnedItemStates } from '../compare/_shared/pinned-item-state'
import type { ComparisonSummaryViewModel } from '../compare/summary/comparison-summary-vm'
import { createComparisonSummaryViewModels } from '../compare/summary/comparison-summary-vm'
import type { StatsTableViewModel } from '../stats/stats-table-vm'
import { createStatsTableViewModel } from '../stats/stats-table-vm'
import { TabBarViewModel } from './tab-bar-vm'
import type { TabItemViewModel } from './tab-item-vm'

export interface SummaryViewModel {
  statsTableViewModel?: StatsTableViewModel
  tabBarViewModel: TabBarViewModel
  checkSummaryViewModel: CheckSummaryViewModel
  comparisonSummary?: ComparisonSummary
  comparisonViewsSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByScenarioSummaryViewModel?: ComparisonSummaryViewModel
  comparisonsByDatasetSummaryViewModel?: ComparisonSummaryViewModel
  baselineTestSummaries: Map<DatasetKey, ComparisonTestSummary>
}

export function createSummaryViewModel(
  checkDataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport,
  comparisonConfig: ComparisonConfig | undefined,
  comparisonSummary: ComparisonSummary | undefined,
  pinnedItemStates: PinnedItemStates,
  sortMode: Readable<ComparisonSortMode>,
  skipComparisonScenarios: ComparisonScenarioTitleSpec[] = []
): SummaryViewModel {
  interface TabInfo {
    subtitle: string
    status: string
  }

  function getTabInfo(
    diffCount: Readable<{ count: number; kind: string }>,
    skippedScenarioCount: Readable<number>
  ): Readable<TabInfo> {
    return derived([diffCount, skippedScenarioCount], ([$diffCount, $skippedScenarioCount]) => {
      if ($diffCount.count === 0) {
        if ($skippedScenarioCount === 0) {
          // There are no diffs and no skipped scenarios
          return {
            subtitle: 'all clear',
            status: 'passed'
          }
        } else {
          // There are no diffs, but there are skipped scenarios
          const kindPart = $skippedScenarioCount === 1 ? 'scenario' : 'scenarios'
          return {
            subtitle: `no diffs, but ${skippedScenarioCount} skipped ${kindPart}`,
            status: 'warning'
          }
        }
      } else {
        // There are diffs
        // TODO: For now we say "diffs" even though some might be errors
        const kindPart = $diffCount.count === 1 ? $diffCount.kind : `${$diffCount.kind}s`
        return {
          subtitle: `${$diffCount.count} ${kindPart} with diffs`,
          status: 'warning'
        }
      }
    })
  }

  const tabItems: TabItemViewModel[] = []
  function addTabItem(id: string, title: string, tabInfo: Readable<TabInfo>): void {
    tabItems.push({
      id,
      title,
      subtitle: derived(tabInfo, $tabInfo => $tabInfo.subtitle),
      subtitleClass: derived(tabInfo, $tabInfo => `status-color-${$tabInfo.status}`)
    })
  }

  // Always add the check summary tab (if there are no checks defined, it will say "No checks",
  // which is better than having no content at all)
  const checkSummaryViewModel = createCheckSummaryViewModel(checkDataCoordinator, checkReport)
  let checkTabInfo: TabInfo
  if (checkSummaryViewModel.total === 0) {
    checkTabInfo = {
      subtitle: 'no checks',
      status: 'none'
    }
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
    checkTabInfo = {
      subtitle: parts.join(', '),
      status: 'failed'
    }
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
    checkTabInfo = {
      subtitle: parts.join(', '),
      status: status
    }
  }
  addTabItem('checks', 'Checks', writable(checkTabInfo))

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
      sortMode,
      skipComparisonScenarios
    )
    const skippedScenarioCount = comparisonSummaries.skippedScenarioCount

    // Add tab for comparison views, if some are defined
    if (comparisonSummaries.views) {
      comparisonViewsSummaryViewModel = comparisonSummaries.views

      // For now, if we have one or more views that show graphs grouped by diffs, report the
      // number of changed graphs.  If no graph differences, report the number of views
      // (scenarios) with differences.
      const allViewRows = comparisonSummaries.views.allRows
      const viewRowsWithDiffsCount = comparisonViewsSummaryViewModel.rowsWithDiffs
      const viewsDiffCount = derived(
        [allViewRows, viewRowsWithDiffsCount],
        ([$allViewRows, $viewRowsWithDiffsCount]) => {
          let changedGraphCount = 0
          for (const row of $allViewRows) {
            // TODO: We may end up counting the same graph here multiple times if there are multiple
            // views that use "grouped-by-diffs" mode and display the same subset of graphs in each.
            // Ideally we would get the number of unique graphs with changes here instead.
            const view = row.viewMetadata?.view
            if (view?.kind === 'view' && view.graphOrder === 'grouped-by-diffs') {
              changedGraphCount += row?.viewMetadata?.changedGraphCount || 0
            }
          }
          if (changedGraphCount > 0) {
            // Show "N graphs with diffs"
            return {
              count: changedGraphCount,
              kind: 'graph'
            }
          } else {
            // Show "N views with diffs"
            return {
              count: $viewRowsWithDiffsCount,
              kind: 'view'
            }
          }
        }
      )
      // if (changedGraphCount > 0) {
      const viewsTabInfo = getTabInfo(viewsDiffCount, skippedScenarioCount)
      addTabItem('comp-views', 'Comparison views', viewsTabInfo)
    }

    // Add tab for by-scenario summaries
    const byScenarioDiffCount = derived(comparisonSummaries.byScenario.rowsWithDiffs, $rowsWithDiffs => ({
      count: $rowsWithDiffs,
      kind: 'scenario'
    }))
    comparisonsByScenarioSummaryViewModel = comparisonSummaries.byScenario
    const byScenarioTabInfo = getTabInfo(byScenarioDiffCount, skippedScenarioCount)
    addTabItem('comps-by-scenario', 'Comparisons by scenario', byScenarioTabInfo)

    // Add tab for by-dataset summaries
    comparisonsByDatasetSummaryViewModel = comparisonSummaries.byDataset
    const byDatasetDiffCount = derived(comparisonSummaries.byDataset.rowsWithDiffs, $rowsWithDiffs => ({
      count: $rowsWithDiffs,
      kind: 'dataset'
    }))
    const byDatasetTabInfo = getTabInfo(byDatasetDiffCount, skippedScenarioCount)
    addTabItem('comps-by-dataset', 'Comparisons by dataset', byDatasetTabInfo)
  }

  // Select the first tab that has differences by default; if no differences, show the
  // first ("Checks") tab by default
  const initialTabIndex = tabItems.findIndex(item => get(item.subtitle) !== 'all clear')
  const tabBarViewModel = new TabBarViewModel(tabItems, initialTabIndex >= 0 ? initialTabIndex : 0)

  // Create a map of all test summaries for the baseline (all inputs at default) scenario.
  // This will be used to compute relative-to-baseline diff values in the detail view.
  const baselineTestSummaries = new Map<DatasetKey, ComparisonTestSummary>()
  const allScenarios = [...(comparisonConfig?.scenarios.getAllScenarios() ?? [])]
  const baselineScenarioKey = allScenarios.find(
    scenario => scenario.settings.kind === 'all-inputs-settings' && scenario.settings.position === 'at-default'
  )?.key
  if (baselineScenarioKey) {
    for (const testSummary of comparisonSummary?.testSummaries ?? []) {
      const scenarioKey = testSummary.s
      const datasetKey = testSummary.d
      if (scenarioKey === baselineScenarioKey) {
        baselineTestSummaries.set(datasetKey, testSummary)
      }
    }
  }

  return {
    statsTableViewModel,
    tabBarViewModel,
    checkSummaryViewModel,
    comparisonSummary,
    comparisonViewsSummaryViewModel,
    comparisonsByScenarioSummaryViewModel,
    comparisonsByDatasetSummaryViewModel,
    baselineTestSummaries
  }
}
