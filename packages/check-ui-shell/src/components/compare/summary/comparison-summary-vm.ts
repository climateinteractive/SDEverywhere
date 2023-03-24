// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ComparisonConfig, ComparisonGroupSummary, ComparisonTestSummary } from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries } from '@sdeverywhere/check-core'

import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'
import { getAllGraphsSections } from '../detail/compare-detail-vm'

import type { ComparisonSummaryRowViewModel, ComparisonViewKey } from './comparison-summary-row-vm'

export interface ComparisonSummarySectionViewModel {
  header: ComparisonSummaryRowViewModel
  rows: ComparisonSummaryRowViewModel[]
}

export interface ComparisonViewsSummaryViewModel {
  kind: 'views'
  allRows: ComparisonSummaryRowViewModel[]
  viewGroups: ComparisonSummarySectionViewModel[]
}

export interface ComparisonsByScenarioSummaryViewModel {
  kind: 'by-scenario'
  allRows: ComparisonSummaryRowViewModel[]
  scenariosOnlyInLeft?: ComparisonSummarySectionViewModel
  scenariosOnlyInRight?: ComparisonSummarySectionViewModel
  scenariosWithDiffs?: ComparisonSummarySectionViewModel
  scenariosWithoutDiffs?: ComparisonSummarySectionViewModel
}

export interface ComparisonsByDatasetSummaryViewModel {
  kind: 'by-dataset'
  allRows: ComparisonSummaryRowViewModel[]
  datasetsOnlyInLeft?: ComparisonSummarySectionViewModel
  datasetsOnlyInRight?: ComparisonSummarySectionViewModel
  datasetsWithDiffs?: ComparisonSummarySectionViewModel
  datasetsWithoutDiffs?: ComparisonSummarySectionViewModel
}

export type ComparisonSummaryViewModel =
  | ComparisonViewsSummaryViewModel
  | ComparisonsByScenarioSummaryViewModel
  | ComparisonsByDatasetSummaryViewModel

export interface ComparisonSummaryViewModels {
  views?: ComparisonViewsSummaryViewModel
  byScenario: ComparisonsByScenarioSummaryViewModel
  byDataset: ComparisonsByDatasetSummaryViewModel
}

export function createComparisonSummaryViewModels(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): ComparisonSummaryViewModels {
  // Group and categorize the comparison results
  const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
  const groupsByScenario = comparisonGroups.byScenario
  const groupsByDataset = comparisonGroups.byDataset

  // XXX: Views don't currently have a unique key of their own, so we assign them at runtime
  let viewId = 1
  function genViewKey(): ComparisonViewKey {
    return `view_${viewId++}`
  }

  const viewGroupSections: ComparisonSummarySectionViewModel[] = []
  for (const viewGroup of comparisonConfig.viewGroups) {
    const viewRows: ComparisonSummaryRowViewModel[] = viewGroup.views.map(view => {
      switch (view.kind) {
        case 'view': {
          // Get the comparison test results for the scenario used in this view
          const scenario = view.scenario
          const groupSummary = groupsByScenario.allGroupSummaries.get(scenario.key)
          let diffPercentByBucket: number[]
          if (view.graphs === 'all') {
            // For the special "all graphs" case, use the graph differences (instead of the dataset
            // differences) for the purposes of computing bucket colors for the bar
            // TODO: We should save the result of this comparison; currently we do it once here,
            // and then again when the detail view is shown
            const testSummaries = groupSummary.group.testSummaries
            const allGraphs = getAllGraphsSections(comparisonConfig, undefined, scenario, testSummaries)
            diffPercentByBucket = allGraphs.diffPercentByBucket
          } else {
            // Otherwise, use the dataset differences
            // TODO: We should only look at datasets that appear in the specified graphs, not all datasets
            diffPercentByBucket = groupSummary.scores?.diffPercentByBucket
          }
          return {
            kind: 'views',
            groupKey: genViewKey(),
            title: view.title,
            subtitle: view.subtitle,
            diffPercentByBucket,
            groupSummary,
            viewMetadata: {
              viewGroup,
              view
            }
          }
        }
        case 'unresolved-view':
          // TODO: Show proper error message here
          return {
            kind: 'views',
            groupKey: genViewKey(),
            title: 'Unresolved view'
          }
        default:
          assertNever(view)
      }
    })

    const headerRow: ComparisonSummaryRowViewModel = {
      kind: 'views',
      title: viewGroup.title,
      header: true
    }

    viewGroupSections.push({
      header: headerRow,
      rows: viewRows
    })
  }

  // Helper that prepends the given string with `count` and replaces `{replace}`
  // with `{replace}s` if count is not one
  function countString(count: number, s: string, replace: string): string {
    return `${count} ${count !== 1 ? s.replace(replace, `${replace}s`) : s}`
  }

  function rowForGroupSummary(groupSummary: ComparisonGroupSummary): ComparisonSummaryRowViewModel {
    let kind: ComparisonGroupingKind
    let title: string
    let subtitle: string
    const root = groupSummary.root
    switch (root.kind) {
      case 'dataset': {
        kind = 'by-dataset'
        // TODO: Handle renames better (show changes in an annotation)
        const outputVar = root.outputVarR || root.outputVarL
        title = outputVar.varName
        subtitle = outputVar.sourceName
        break
      }
      case 'scenario':
        kind = 'by-scenario'
        title = root.title
        subtitle = root.subtitle
        break
      default:
        assertNever(root)
    }

    return {
      kind,
      groupKey: groupSummary.group.key,
      title,
      subtitle,
      diffPercentByBucket: groupSummary.scores?.diffPercentByBucket,
      groupSummary
    }
  }

  function section(
    groupSummaries: ComparisonGroupSummary[],
    headerText: string,
    count = true
  ): ComparisonSummarySectionViewModel | undefined {
    if (groupSummaries.length > 0) {
      const rows: ComparisonSummaryRowViewModel[] = groupSummaries.map(rowForGroupSummary)

      let kind: ComparisonGroupingKind
      let replace: string
      if (headerText.includes('scenario')) {
        kind = 'by-scenario'
        replace = 'scenario'
      } else {
        kind = 'by-dataset'
        replace = 'variable'
      }

      if (count) {
        headerText = countString(rows.length, headerText, replace)
      }

      const headerRow: ComparisonSummaryRowViewModel = {
        kind,
        title: headerText,
        header: true
      }

      return {
        header: headerRow,
        rows
      }
    } else {
      return undefined
    }
  }

  // Build the by-scenario comparison sections
  // TODO: Replace left and right here
  const scenariosOnlyInLeft = section(groupsByScenario.onlyInLeft, 'scenario only valid in [left]…')
  const scenariosOnlyInRight = section(groupsByScenario.onlyInRight, 'scenario only valid in [right]…')
  const scenariosWithDiffs = section(groupsByScenario.withDiffs, 'scenario producing differences…')
  const scenariosWithoutDiffs = section(
    groupsByScenario.withoutDiffs,
    'No differences produced by the following scenarios…',
    false
  )

  // Build the by-dataset comparison sections
  const datasetsOnlyInLeft = section(groupsByDataset.onlyInLeft, 'removed output variable…')
  const datasetsOnlyInRight = section(groupsByDataset.onlyInRight, 'added output variable…')
  const datasetsWithDiffs = section(groupsByDataset.withDiffs, 'output variable with differences…')
  const datasetsWithoutDiffs = section(
    groupsByDataset.withoutDiffs,
    'No differences detected for the following outputs…',
    false
  )

  // Create a flat array of all rows for each grouping to make it easier to set up the navigation links
  function addRows(allRows: ComparisonSummaryRowViewModel[], section?: ComparisonSummarySectionViewModel): void {
    if (section) {
      allRows.push(...section.rows)
    }
  }

  // Build the summary view models
  let viewsSummary: ComparisonViewsSummaryViewModel
  if (viewGroupSections.length > 0) {
    const allViewRows: ComparisonSummaryRowViewModel[] = []
    for (const viewGroupSection of viewGroupSections) {
      allViewRows.push(...viewGroupSection.rows)
    }
    viewsSummary = {
      kind: 'views',
      allRows: allViewRows,
      viewGroups: viewGroupSections
    }
  }

  const allScenarioRows: ComparisonSummaryRowViewModel[] = []
  addRows(allScenarioRows, scenariosOnlyInLeft)
  addRows(allScenarioRows, scenariosOnlyInRight)
  addRows(allScenarioRows, scenariosWithDiffs)
  addRows(allScenarioRows, scenariosWithoutDiffs)
  const byScenarioSummary: ComparisonsByScenarioSummaryViewModel = {
    kind: 'by-scenario',
    allRows: allScenarioRows,
    scenariosOnlyInLeft,
    scenariosOnlyInRight,
    scenariosWithDiffs,
    scenariosWithoutDiffs
  }

  const allDatasetRows: ComparisonSummaryRowViewModel[] = []
  addRows(allDatasetRows, datasetsOnlyInLeft)
  addRows(allDatasetRows, datasetsOnlyInRight)
  addRows(allDatasetRows, datasetsWithDiffs)
  addRows(allDatasetRows, datasetsWithoutDiffs)
  const byDatasetSummary: ComparisonsByDatasetSummaryViewModel = {
    kind: 'by-dataset',
    allRows: allDatasetRows,
    datasetsOnlyInLeft,
    datasetsOnlyInRight,
    datasetsWithDiffs,
    datasetsWithoutDiffs
  }

  return {
    views: viewsSummary,
    byScenario: byScenarioSummary,
    byDataset: byDatasetSummary
  }
}
