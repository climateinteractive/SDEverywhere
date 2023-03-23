// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ComparisonConfig, ComparisonGroupSummary, ComparisonTestSummary } from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries } from '@sdeverywhere/check-core'

import type { CompareSummaryRowViewModel, ComparisonViewKey } from './compare-summary-row-vm'
import { getAllGraphsSections } from '../detail/compare-detail-vm'

export interface CompareSummarySectionViewModel {
  header: CompareSummaryRowViewModel
  rows: CompareSummaryRowViewModel[]
}

export interface CompareSummaryViewModel {
  allRows: CompareSummaryRowViewModel[]
  viewGroups?: CompareSummarySectionViewModel[]
  scenariosOnlyInLeft?: CompareSummarySectionViewModel
  scenariosOnlyInRight?: CompareSummarySectionViewModel
  scenariosWithDiffs?: CompareSummarySectionViewModel
  scenariosWithoutDiffs?: CompareSummarySectionViewModel
  datasetsOnlyInLeft?: CompareSummarySectionViewModel
  datasetsOnlyInRight?: CompareSummarySectionViewModel
  datasetsWithDiffs?: CompareSummarySectionViewModel
  datasetsWithoutDiffs?: CompareSummarySectionViewModel
}

export function createCompareSummaryViewModel(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): CompareSummaryViewModel {
  // Group and categorize the comparison results
  const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
  const groupsByScenario = comparisonGroups.byScenario
  const groupsByDataset = comparisonGroups.byDataset

  // XXX: Views don't currently have a unique key of their own, so we assign them at runtime
  let viewId = 1
  function genViewKey(): ComparisonViewKey {
    return `view_${viewId++}`
  }

  const viewGroupSections: CompareSummarySectionViewModel[] = []
  for (const viewGroup of comparisonConfig.viewGroups) {
    const viewRows: CompareSummaryRowViewModel[] = viewGroup.views.map(view => {
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
            groupKey: genViewKey(),
            title: view.title,
            subtitle: view.subtitle,
            diffPercentByBucket,
            groupSummary,
            view
          }
        }
        case 'unresolved-view':
          // TODO: Show proper error message here
          return {
            groupKey: genViewKey(),
            title: 'Unresolved view'
          }
        default:
          assertNever(view)
      }
    })

    const headerRow: CompareSummaryRowViewModel = {
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

  function rowForGroupSummary(groupSummary: ComparisonGroupSummary): CompareSummaryRowViewModel {
    let title: string
    let subtitle: string
    const root = groupSummary.root
    switch (root.kind) {
      case 'dataset': {
        // TODO: Handle renames better (show changes in an annotation)
        const outputVar = root.outputVarR || root.outputVarL
        title = outputVar.varName
        subtitle = outputVar.sourceName
        break
      }
      case 'scenario':
        title = root.title
        subtitle = root.subtitle
        break
      default:
        assertNever(root)
    }

    return {
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
  ): CompareSummarySectionViewModel | undefined {
    if (groupSummaries.length > 0) {
      const rows: CompareSummaryRowViewModel[] = groupSummaries.map(rowForGroupSummary)

      let replace: string
      if (headerText.includes('scenario')) {
        replace = 'scenario'
      } else {
        replace = 'variable'
      }

      if (count) {
        headerText = countString(rows.length, headerText, replace)
      }

      const headerRow: CompareSummaryRowViewModel = {
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

  // Create a flat array of all rows to make it easier to set up the navigation links
  const allRows: CompareSummaryRowViewModel[] = []
  function addRows(section?: CompareSummarySectionViewModel): void {
    if (section) {
      allRows.push(...section.rows)
    }
  }
  for (const viewGroupSection of viewGroupSections) {
    addRows(viewGroupSection)
  }
  addRows(scenariosOnlyInLeft)
  addRows(scenariosOnlyInRight)
  addRows(scenariosWithDiffs)
  addRows(scenariosWithoutDiffs)
  addRows(datasetsOnlyInLeft)
  addRows(datasetsOnlyInRight)
  addRows(datasetsWithDiffs)
  addRows(datasetsWithoutDiffs)

  // Build the summary view model
  return {
    allRows,
    viewGroups: viewGroupSections,
    scenariosOnlyInLeft,
    scenariosOnlyInRight,
    scenariosWithDiffs,
    scenariosWithoutDiffs,
    datasetsOnlyInLeft,
    datasetsOnlyInRight,
    datasetsWithDiffs,
    datasetsWithoutDiffs
  }
}
