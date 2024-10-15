// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { derived, writable, type Readable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonGroupSummary,
  ComparisonTestSummary,
  ComparisonView,
  ComparisonViewGroup
} from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries, getScoresForTestSummaries } from '@sdeverywhere/check-core'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { hasSignificantDiffs } from '../_shared/buckets'
import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'
import type { PinnedItemState, PinnedItemStates } from '../_shared/pinned-item-state'
import { datasetSpan } from '../_shared/spans'

import { getGraphsGroupedByDiffs } from '../detail/compare-detail-vm'

import type { ComparisonSummaryRowViewModel, ComparisonViewKey } from './comparison-summary-row-vm'

export interface ComparisonSummarySectionViewModel {
  header: ComparisonSummaryRowViewModel
  rows: ComparisonSummaryRowViewModel[]
}

export interface ComparisonViewsSummaryViewModel {
  kind: 'views'
  rowsWithDiffs: number
  allRows: Readable<ComparisonSummaryRowViewModel[]>
  viewGroups: ComparisonSummarySectionViewModel[]
}

export class ComparisonsByItemSummaryViewModel {
  public kind = 'by-item'

  public readonly rowsWithDiffs: number

  private readonly regularRows: ComparisonSummaryRowViewModel[]
  public readonly pinnedRows: Readable<ComparisonSummaryRowViewModel[]>
  public readonly allRows: Readable<ComparisonSummaryRowViewModel[]>

  constructor(
    private readonly pinnedItemState: PinnedItemState,
    public readonly itemKind: 'scenario' | 'dataset',
    public readonly withErrors?: ComparisonSummarySectionViewModel,
    public readonly onlyInLeft?: ComparisonSummarySectionViewModel,
    public readonly onlyInRight?: ComparisonSummarySectionViewModel,
    public readonly withDiffs?: ComparisonSummarySectionViewModel,
    public readonly withoutDiffs?: ComparisonSummarySectionViewModel
  ) {
    // Create an array that holds all regular rows and determine the number
    // of rows with differences
    let rowsWithDiffs = 0
    const regularRows: ComparisonSummaryRowViewModel[] = []
    const addRows = (section?: ComparisonSummarySectionViewModel) => {
      if (section?.rows.length > 0) {
        rowsWithDiffs += section.rows.length
        regularRows.push(...section.rows)
      }
    }
    addRows(withErrors)
    addRows(onlyInLeft)
    addRows(onlyInRight)
    addRows(withDiffs)
    addRows(withoutDiffs)
    this.rowsWithDiffs = rowsWithDiffs
    this.regularRows = regularRows

    // Derive the pinned row view models from the pinned item state
    this.pinnedRows = derived(pinnedItemState.orderedKeys, $orderedKeys => {
      const pinnedRows: ComparisonSummaryRowViewModel[] = []
      for (const itemKey of $orderedKeys) {
        // XXX: On the "Comparisons by Scenario" view, we don't currently have a good
        // way to display "scenario group" rows that were pinned in the detail view,
        // so exclude them for now
        if (itemKey.startsWith('row')) {
          continue
        }
        // The pinned row is a clone of the original row, except that the pinned one has
        // a key with 'pinned_' in the front to differentiate it from the normal row
        const regularRow = this.regularRows.find(row => row.key === itemKey)
        if (regularRow === undefined) {
          throw new Error(`No regular row found for key=${itemKey}`)
        }
        pinnedRows.push({
          ...regularRow,
          key: `pinned_${regularRow.key}`
        })
      }
      return pinnedRows
    })

    // Derive the array of all rows (pinned rows + regular rows)
    this.allRows = derived(this.pinnedRows, $pinnedRows => {
      return [...$pinnedRows, ...this.regularRows]
    })
  }

  // TODO: This is only used in `comparison-summary-pinned.svelte` and can be removed
  // if we decide to not use that component
  public toggleItemPinned(row: ComparisonSummaryRowViewModel): void {
    // Note that `row` can either be a normal row or a pinned row (since they both
    // have a toggle button), so we need to get the key for the regular row here
    const key = row.key.startsWith('pinned_') ? row.key.replace('pinned_', '') : row.key
    this.pinnedItemState.toggleItemPinned(key)
  }

  // TODO: This is only used in `comparison-summary-pinned.svelte` and can be removed
  // if we decide to not use that component
  public setReorderedPinnedItems(rows: ComparisonSummaryRowViewModel[]): void {
    // Use the new order of items that resulted from a drag-and-drop operation
    this.pinnedItemState.setItemOrder(rows.map(row => row.key.replace('pinned_', '')))
  }
}

export type ComparisonSummaryViewModel = ComparisonViewsSummaryViewModel | ComparisonsByItemSummaryViewModel

export interface ComparisonSummaryViewModels {
  views?: ComparisonViewsSummaryViewModel
  byScenario: ComparisonsByItemSummaryViewModel
  byDataset: ComparisonsByItemSummaryViewModel
}

export function createComparisonSummaryViewModels(
  comparisonConfig: ComparisonConfig,
  pinnedItemStates: PinnedItemStates,
  terseSummaries: ComparisonTestSummary[]
): ComparisonSummaryViewModels {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  // Group and categorize the comparison results
  const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
  const allTestSummaries = comparisonGroups.allTestSummaries
  const groupsByScenario = comparisonGroups.byScenario
  const groupsByDataset = comparisonGroups.byDataset

  // XXX: Views don't currently have a unique key of their own, so we assign them at runtime
  let viewId = 1
  function genViewKey(): ComparisonViewKey {
    return `view_${viewId++}`
  }

  // Helper function that creates a summary row view model for a single-scenario comparison view
  function rowForViewWithScenario(view: ComparisonView, viewGroup: ComparisonViewGroup): ComparisonSummaryRowViewModel {
    // Get the comparison test results for the scenario used in this view
    const scenario = view.scenario
    const groupSummary = groupsByScenario.allGroupSummaries.get(scenario.key)
    let diffPercentByBucket: number[]
    let changedGraphCount: number
    if (view.graphOrder === 'grouped-by-diffs') {
      // Use the graph differences (instead of the dataset differences) for the purposes of computing
      // bucket colors for the bar
      // TODO: We should save the result of this comparison; currently we do it once here,
      // and then again when the detail view is shown
      const testSummaries = groupSummary.group.testSummaries
      const grouped = getGraphsGroupedByDiffs(comparisonConfig, undefined, scenario, testSummaries, view.graphIds)
      diffPercentByBucket = grouped.diffPercentByBucket
      changedGraphCount = grouped.nonZeroDiffCount
    } else {
      // Otherwise, use the dataset differences
      // TODO: We should only look at datasets that appear in the specified graphs, not all datasets
      diffPercentByBucket = groupSummary.scores?.diffPercentByBucket
    }
    return {
      kind: 'views',
      key: genViewKey(),
      title: view.title,
      subtitle: view.subtitle,
      diffPercentByBucket,
      groupSummary,
      viewMetadata: {
        viewGroup,
        view,
        changedGraphCount
      }
    }
  }

  // Helper function that creates a summary row view model for a comparison view with freeform rows
  function rowForViewWithFreeformRows(
    view: ComparisonView,
    viewGroup: ComparisonViewGroup
  ): ComparisonSummaryRowViewModel {
    // Get the comparison test results for the boxes used in this view
    const testSummariesForView: ComparisonTestSummary[] = []
    for (const row of view.rows) {
      for (const box of row.boxes) {
        // TODO: For now we assume that we only show boxes that have a fully resolved dataset/scenario
        // pairing.  If we change that assumption, this code may need to change to only include the
        // results where both sides are valid/resolved.
        const testSummary = allTestSummaries.find(s => s.d === box.dataset.key && s.s === box.scenario.key)
        if (testSummary) {
          testSummariesForView.push(testSummary)
        }
      }
    }

    // Determine the number of differences per bucket
    const scoresForView = getScoresForTestSummaries(testSummariesForView, comparisonConfig.thresholds)
    const diffPercentByBucket = scoresForView.diffPercentByBucket

    return {
      kind: 'views',
      key: genViewKey(),
      title: view.title,
      subtitle: view.subtitle,
      diffPercentByBucket,
      viewMetadata: {
        viewGroup,
        view
      }
    }
  }

  // Create summary row view models for each comparison view
  let viewRowsWithDiffs = 0
  const viewGroupSections: ComparisonSummarySectionViewModel[] = []
  for (const viewGroup of comparisonConfig.viewGroups) {
    const headerRow: ComparisonSummaryRowViewModel = {
      kind: 'views',
      title: viewGroup.title,
      header: true
    }
    const viewRows: ComparisonSummaryRowViewModel[] = viewGroup.views.map(view => {
      switch (view.kind) {
        case 'view': {
          let summaryRow: ComparisonSummaryRowViewModel
          if (view.scenario) {
            summaryRow = rowForViewWithScenario(view, viewGroup)
          } else {
            summaryRow = rowForViewWithFreeformRows(view, viewGroup)
          }
          if (hasSignificantDiffs(summaryRow.diffPercentByBucket)) {
            // If the scenario has issues or has non-zero differences, treat it as a row with diffs
            viewRowsWithDiffs++
          }
          return summaryRow
        }
        case 'unresolved-view':
          // If the view is unresolved, treat it as a row with diffs
          viewRowsWithDiffs++
          // TODO: Show proper error message here
          return {
            kind: 'views',
            key: genViewKey(),
            title: 'Unresolved view',
            viewMetadata: {
              viewGroup,
              view
            }
          }
        default:
          assertNever(view)
      }
    })
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
    let annotations: string
    const root = groupSummary.root
    switch (root.kind) {
      case 'dataset': {
        kind = 'by-dataset'
        const outputVar = root.outputVarR || root.outputVarL
        title = outputVar.varName
        subtitle = outputVar.sourceName
        annotations = getAnnotationsForDataset(root, bundleNameL, bundleNameR).join(' ')
        break
      }
      case 'scenario':
        kind = 'by-scenario'
        title = root.title
        subtitle = root.subtitle
        annotations = getAnnotationsForScenario(root, bundleNameL, bundleNameR).join(' ')
        break
      default:
        assertNever(root)
    }

    return {
      kind,
      key: groupSummary.group.key,
      title,
      subtitle,
      annotations,
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
  const nameL = datasetSpan(bundleNameL, 'left')
  const nameR = datasetSpan(bundleNameR, 'right')
  const scenariosWithErrors = section(groupsByScenario.withErrors, 'scenario with errors…')
  const scenariosOnlyInLeft = section(groupsByScenario.onlyInLeft, `scenario only valid in ${nameL}…`)
  const scenariosOnlyInRight = section(groupsByScenario.onlyInRight, `scenario only valid in ${nameR}…`)
  const scenariosWithDiffs = section(groupsByScenario.withDiffs, 'scenario producing differences…')
  const scenariosWithoutDiffs = section(
    groupsByScenario.withoutDiffs,
    'No differences produced by the following scenarios…',
    false
  )

  // Build the by-dataset comparison sections
  const datasetsWithErrors = section(groupsByDataset.withErrors, 'output variable with errors…')
  const datasetsOnlyInLeft = section(groupsByDataset.onlyInLeft, 'removed output variable…')
  const datasetsOnlyInRight = section(groupsByDataset.onlyInRight, 'added output variable…')
  const datasetsWithDiffs = section(groupsByDataset.withDiffs, 'output variable with differences…')
  const datasetsWithoutDiffs = section(
    groupsByDataset.withoutDiffs,
    'No differences detected for the following outputs…',
    false
  )

  // Build the summary view models
  let viewsSummary: ComparisonViewsSummaryViewModel
  if (viewGroupSections.length > 0) {
    const allViewRows: ComparisonSummaryRowViewModel[] = []
    for (const viewGroupSection of viewGroupSections) {
      allViewRows.push(...viewGroupSection.rows)
    }
    viewsSummary = {
      kind: 'views',
      allRows: writable(allViewRows),
      rowsWithDiffs: viewRowsWithDiffs,
      viewGroups: viewGroupSections
    }
  }

  const byScenarioSummary = new ComparisonsByItemSummaryViewModel(
    pinnedItemStates.pinnedScenarios,
    'scenario',
    scenariosWithErrors,
    scenariosOnlyInLeft,
    scenariosOnlyInRight,
    scenariosWithDiffs,
    scenariosWithoutDiffs
  )

  const byDatasetSummary = new ComparisonsByItemSummaryViewModel(
    pinnedItemStates.pinnedDatasets,
    'dataset',
    datasetsWithErrors,
    datasetsOnlyInLeft,
    datasetsOnlyInRight,
    datasetsWithDiffs,
    datasetsWithoutDiffs
  )

  return {
    views: viewsSummary,
    byScenario: byScenarioSummary,
    byDataset: byDatasetSummary
  }
}
