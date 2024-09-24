// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { get, writable, type Readable, type Writable } from 'svelte/store'

import type { ComparisonConfig, ComparisonGroupSummary, ComparisonTestSummary } from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries } from '@sdeverywhere/check-core'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { hasSignificantDiffs } from '../_shared/buckets'
import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'
import { datasetSpan } from '../_shared/spans'

import { getAllGraphsSections } from '../detail/compare-detail-vm'

import type { ComparisonSummaryRowViewModel, ComparisonViewKey } from './comparison-summary-row-vm'

export interface ComparisonSummarySectionViewModel {
  header: ComparisonSummaryRowViewModel
  rows: ComparisonSummaryRowViewModel[]
}

export interface ComparisonViewsSummaryViewModel {
  kind: 'views'
  allRows: ComparisonSummaryRowViewModel[]
  rowsWithDiffs: number
  viewGroups: ComparisonSummarySectionViewModel[]
}

export class ComparisonsByItemSummaryViewModel {
  public kind = 'by-item'

  public readonly rowsWithDiffs: number

  public allRows: ComparisonSummaryRowViewModel[]
  private readonly writablePinnedRows: Writable<ComparisonSummaryRowViewModel[]>
  public readonly pinnedRows: Readable<ComparisonSummaryRowViewModel[]>

  constructor(
    public readonly itemKind: 'scenario' | 'dataset',
    public readonly withErrors?: ComparisonSummarySectionViewModel,
    public readonly onlyInLeft?: ComparisonSummarySectionViewModel,
    public readonly onlyInRight?: ComparisonSummarySectionViewModel,
    public readonly withDiffs?: ComparisonSummarySectionViewModel,
    public readonly withoutDiffs?: ComparisonSummarySectionViewModel
  ) {
    // Determine the number of rows with differences
    let rowsWithDiffs = 0
    const count = (section?: ComparisonSummarySectionViewModel) => {
      const rowCount = section?.rows.length || 0
      rowsWithDiffs += rowCount
    }
    count(withErrors)
    count(onlyInLeft)
    count(onlyInRight)
    count(withDiffs)
    this.rowsWithDiffs = rowsWithDiffs

    // Create a writable store to hold the pinned rows
    // TODO: Get initial state from local storage
    this.writablePinnedRows = writable([])
    this.pinnedRows = this.writablePinnedRows

    // Build the initial `allRows` array
    this.rebuildAllRows()
  }

  public toggleItemPinned(row: ComparisonSummaryRowViewModel): void {
    const writablePinned = row.pinned as Writable<boolean>
    const isPinned = get(writablePinned)
    if (isPinned) {
      // The item is currently pinned, so remove it from the array of pinned items and
      // clear the pinned flag on the item
      writablePinned.set(false)
      this.removePinnedItem(row)
    } else {
      // The item is not currently pinned, so add it to the end of the array of pinned
      // items and set the pinned flag on the item
      writablePinned.set(true)
      this.addPinnedItem(row)
    }
  }

  public setPinnedItems(rows: ComparisonSummaryRowViewModel[]): void {
    // Use the new order of items that resulted from a drag-and-drop operation
    this.writablePinnedRows.set(rows)
    this.postUpdatePinnedRows()
  }

  private addPinnedItem(row: ComparisonSummaryRowViewModel): void {
    this.writablePinnedRows.update(rows => {
      // The pinned row is a clone of the original row, except that the pinned one has
      // a key with 'pinned_' in the front to differentiate it from the normal row
      const pinnedRow: ComparisonSummaryRowViewModel = {
        ...row,
        key: `pinned_${row.key}`
      }
      rows.push(pinnedRow)
      return rows
    })
    this.postUpdatePinnedRows()
  }

  private removePinnedItem(row: ComparisonSummaryRowViewModel): void {
    this.writablePinnedRows.update(rows => {
      // Note that `row` can either be a normal row or a pinned row (since they both
      // have a toggle button), so we need to get the key for the pinned row here
      const pinnedRowKey = row.key.startsWith('pinned_') ? row.key : `pinned_${row.key}`
      const index = rows.findIndex(r => r.key === pinnedRowKey)
      if (index >= 0) {
        rows.splice(index, 1)
      }
      return rows
    })
    this.postUpdatePinnedRows()
  }

  private postUpdatePinnedRows(): void {
    // Rebuild the `allRows` array whenever there are changes to the pinned rows
    this.rebuildAllRows()

    // TODO: Update local storage
  }

  private rebuildAllRows(): void {
    // Rebuild the `allRows` array to include pinned rows plus all normal rows
    const allRows: ComparisonSummaryRowViewModel[] = []
    const addRows = (section?: ComparisonSummarySectionViewModel) => {
      if (section?.rows.length > 0) {
        allRows.push(...section.rows)
      }
    }
    const pinnedRows = get(this.writablePinnedRows)
    if (pinnedRows.length > 0) {
      allRows.push(...pinnedRows)
    }
    addRows(this.withErrors)
    addRows(this.onlyInLeft)
    addRows(this.onlyInRight)
    addRows(this.withDiffs)
    addRows(this.withoutDiffs)
    this.allRows = allRows
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
  terseSummaries: ComparisonTestSummary[]
): ComparisonSummaryViewModels {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  // Group and categorize the comparison results
  const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
  const groupsByScenario = comparisonGroups.byScenario
  const groupsByDataset = comparisonGroups.byDataset

  // XXX: Views don't currently have a unique key of their own, so we assign them at runtime
  let viewId = 1
  function genViewKey(): ComparisonViewKey {
    return `view_${viewId++}`
  }

  let viewRowsWithDiffs = 0
  const viewGroupSections: ComparisonSummarySectionViewModel[] = []
  for (const viewGroup of comparisonConfig.viewGroups) {
    const viewRows: ComparisonSummaryRowViewModel[] = viewGroup.views.map(view => {
      switch (view.kind) {
        case 'view': {
          // Get the comparison test results for the scenario used in this view
          const scenario = view.scenario
          const groupSummary = groupsByScenario.allGroupSummaries.get(scenario.key)
          let diffPercentByBucket: number[]
          let changedGraphCount: number
          if (view.graphs === 'all') {
            // For the special "all graphs" case, use the graph differences (instead of the dataset
            // differences) for the purposes of computing bucket colors for the bar
            // TODO: We should save the result of this comparison; currently we do it once here,
            // and then again when the detail view is shown
            const testSummaries = groupSummary.group.testSummaries
            const allGraphs = getAllGraphsSections(comparisonConfig, undefined, scenario, testSummaries)
            diffPercentByBucket = allGraphs.diffPercentByBucket
            changedGraphCount = allGraphs.nonZeroDiffCount
          } else {
            // Otherwise, use the dataset differences
            // TODO: We should only look at datasets that appear in the specified graphs, not all datasets
            diffPercentByBucket = groupSummary.scores?.diffPercentByBucket
          }
          if (hasSignificantDiffs(diffPercentByBucket)) {
            // If the scenario has issues or has non-zero differences, treat it as a row with diffs
            viewRowsWithDiffs++
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
        case 'unresolved-view':
          // TODO: Show proper error message here
          viewRowsWithDiffs++
          return {
            kind: 'views',
            key: genViewKey(),
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

    // TODO: Get initial pinned state from local storage
    const pinned = writable(false)

    return {
      kind,
      key: groupSummary.group.key,
      title,
      subtitle,
      annotations,
      diffPercentByBucket: groupSummary.scores?.diffPercentByBucket,
      groupSummary,
      pinned
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
  // const pinnedScenarios = section(groupsByScenario.withoutDiffs, 'pinned scenario…')
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
      allRows: allViewRows,
      rowsWithDiffs: viewRowsWithDiffs,
      viewGroups: viewGroupSections
    }
  }

  const byScenarioSummary = new ComparisonsByItemSummaryViewModel(
    'scenario',
    scenariosWithErrors,
    scenariosOnlyInLeft,
    scenariosOnlyInRight,
    scenariosWithDiffs,
    scenariosWithoutDiffs
  )

  const byDatasetSummary = new ComparisonsByItemSummaryViewModel(
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
