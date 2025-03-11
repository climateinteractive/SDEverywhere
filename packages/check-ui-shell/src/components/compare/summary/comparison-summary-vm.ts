// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { derived, writable, type Readable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonReportSummaryRow,
  ComparisonScenarioKey,
  ComparisonTestSummary,
  ComparisonView,
  ComparisonViewGroup,
  DatasetKey
} from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries, getScoresForTestSummaries } from '@sdeverywhere/check-core'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { hasSignificantDiffs } from '../_shared/buckets'
import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'
import type { PinnedItemState, PinnedItemStates } from '../_shared/pinned-item-state'
import { datasetSpan } from '../_shared/spans'

import { getGraphsGroupedByDiffs } from '../detail/compare-detail-vm'

import type {
  ComparisonSummaryRowKey,
  ComparisonSummaryRowViewModel,
  ComparisonViewKey
} from './comparison-summary-row-vm'
import type { ComparisonSummarySectionViewModel } from './comparison-summary-section-vm'

export interface ComparisonViewsSummaryViewModel {
  kind: 'views'
  rowsWithDiffs: number
  allRows: Readable<ComparisonSummaryRowViewModel[]>
  sections: ComparisonSummarySectionViewModel[]
}

export class ComparisonsByItemSummaryViewModel {
  public kind = 'by-item'

  private readonly regularRows: ComparisonSummaryRowViewModel[]
  public readonly pinnedRows: Readable<ComparisonSummaryRowViewModel[]>
  public readonly allRows: Readable<ComparisonSummaryRowViewModel[]>

  constructor(
    private readonly pinnedItemState: PinnedItemState,
    public readonly itemKind: 'scenario' | 'dataset',
    public readonly sections: ComparisonSummarySectionViewModel[],
    public readonly rowsWithDiffs: number
  ) {
    // Create an array that holds all regular rows
    const regularRows: ComparisonSummaryRowViewModel[] = []
    for (const section of sections) {
      regularRows.push(...section.rows)
    }
    this.regularRows = regularRows

    // Derive the pinned row view models from the pinned item state
    this.pinnedRows = derived(pinnedItemState.orderedKeys, $orderedKeys => {
      const pinnedRows: ComparisonSummaryRowViewModel[] = []
      for (const itemKey of $orderedKeys) {
        // XXX: On the "Comparisons by scenario" view, we don't currently have a good
        // way to display "scenario group" rows that were pinned in the detail view,
        // so exclude them for now
        if (itemKey.startsWith('row')) {
          continue
        }
        // The pinned row is a clone of the original row, except that the pinned one has
        // a key with 'pinned_' in the front to differentiate it from the normal row
        const regularRow = this.regularRows.find(row => row.itemKey === itemKey)
        if (regularRow === undefined) {
          throw new Error(`No regular row found for key=${itemKey}`)
        }
        pinnedRows.push({
          ...regularRow,
          rowKey: `pinned_${regularRow.itemKey}`
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
    this.pinnedItemState.toggleItemPinned(row.itemKey)
  }

  // TODO: This is only used in `comparison-summary-pinned.svelte` and can be removed
  // if we decide to not use that component
  public setReorderedPinnedItems(rows: ComparisonSummaryRowViewModel[]): void {
    // Use the new order of items that resulted from a drag-and-drop operation
    this.pinnedItemState.setItemOrder(rows.map(row => row.itemKey))
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

  let headerId = 1
  function genHeaderRowKey(): ComparisonSummaryRowKey {
    return `header_${headerId++}`
  }

  let rowId = 1
  function genRowKey(itemKey: DatasetKey | ComparisonScenarioKey | ComparisonViewKey): ComparisonSummaryRowKey {
    return `row_${rowId++}_${itemKey}`
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
    const itemKey = genViewKey()
    const rowKey = genRowKey(itemKey)
    return {
      kind: 'views',
      rowKey,
      itemKey,
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

    const itemKey = genViewKey()
    const rowKey = genRowKey(itemKey)
    return {
      kind: 'views',
      rowKey,
      itemKey,
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
      rowKey: genHeaderRowKey(),
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
        case 'unresolved-view': {
          // If the view is unresolved, treat it as a row with diffs
          viewRowsWithDiffs++
          // TODO: Show proper error message here
          const itemKey = genViewKey()
          const rowKey = genRowKey(itemKey)
          return {
            kind: 'views',
            rowKey,
            itemKey,
            title: 'Unresolved view',
            viewMetadata: {
              viewGroup,
              view
            }
          }
        }
        default:
          assertNever(view)
      }
    })
    viewGroupSections.push({
      header: headerRow,
      rows: viewRows,
      // XXX: This value is not used for the comparison views tab, so we can set it to 0
      rowsWithDiffs: 0,
      expanded: writable(true)
    })
  }

  function viewModelForRow(row: ComparisonReportSummaryRow): ComparisonSummaryRowViewModel {
    let kind: ComparisonGroupingKind
    let title: string
    let subtitle: string
    let annotations: string
    const groupSummary = row.groupSummary
    const root = groupSummary.root
    switch (root.kind) {
      case 'dataset': {
        kind = 'by-dataset'
        const outputVar = root.outputVarR || root.outputVarL
        title = row.title || outputVar.varName
        subtitle = row.subtitle || outputVar.sourceName
        annotations = getAnnotationsForDataset(root, bundleNameL, bundleNameR).join(' ')
        break
      }
      case 'scenario':
        kind = 'by-scenario'
        title = row.title || root.title
        subtitle = row.subtitle || root.subtitle
        annotations = getAnnotationsForScenario(root, bundleNameL, bundleNameR).join(' ')
        break
      default:
        assertNever(root)
    }

    // Note that the same item can be used in multiple sections.  The row key is derived
    // from the item key, but we make each row key distinct.
    const itemKey = groupSummary.group.key
    const rowKey = genRowKey(itemKey)

    return {
      kind,
      rowKey,
      itemKey,
      title,
      subtitle,
      annotations,
      diffPercentByBucket: groupSummary.scores?.diffPercentByBucket,
      groupSummary
    }
  }

  function sectionViewModel(
    kind: ComparisonGroupingKind,
    rows: ComparisonReportSummaryRow[],
    headerText: string,
    initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
  ): ComparisonSummarySectionViewModel | undefined {
    if (rows.length === 0) {
      // Exclude sections that have no rows
      return undefined
    }

    // Create a view model for each row
    const rowViewModels: ComparisonSummaryRowViewModel[] = rows.map(viewModelForRow)

    // Determine the initial expanded state of the section based on the `initialState` value and
    // whether the any row has issues or has non-zero differences
    const rowsWithDiffs = rowViewModels.filter(row => hasSignificantDiffs(row.diffPercentByBucket)).length
    let expanded: boolean
    switch (initialState) {
      case 'collapsed':
        expanded = false
        break
      case 'expanded':
        expanded = true
        break
      case 'expanded-if-diffs':
      default:
        expanded = rowsWithDiffs > 0
        break
    }

    const headerRow: ComparisonSummaryRowViewModel = {
      kind,
      rowKey: genHeaderRowKey(),
      title: headerText,
      header: true
    }

    return {
      header: headerRow,
      rows: rowViewModels,
      rowsWithDiffs,
      expanded: writable(expanded)
    }
  }

  // Build the by-scenario comparison sections
  const nameL = datasetSpan(bundleNameL, 'left')
  const nameR = datasetSpan(bundleNameR, 'right')
  const byScenarioSections: ComparisonSummarySectionViewModel[] = []
  function addByScenarioSection(
    rows: ComparisonReportSummaryRow[],
    headerText: string,
    initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
  ): void {
    const section = sectionViewModel('by-scenario', rows, headerText, initialState)
    if (section) {
      byScenarioSections.push(section)
    }
  }
  function addDefaultByScenarioSection(summaries: ComparisonGroupSummary[], headerText: string): void {
    const rows = summaries.map(groupSummary => ({ groupSummary }))
    addByScenarioSection(rows, headerText, 'expanded-if-diffs')
  }
  if (comparisonConfig.reportOptions?.summarySectionsForComparisonsByScenario) {
    // When a callback is defined, build the custom sections
    const customSections = comparisonConfig.reportOptions.summarySectionsForComparisonsByScenario(groupsByScenario)
    for (const customSection of customSections) {
      addByScenarioSection(customSection.rows, customSection.headerText, customSection.initialState)
    }
  } else {
    // Otherwise, build the default sections
    addDefaultByScenarioSection(groupsByScenario.withErrors, 'Scenarios with errors')
    addDefaultByScenarioSection(groupsByScenario.onlyInLeft, `Scenarios only valid in ${nameL}`)
    addDefaultByScenarioSection(groupsByScenario.onlyInRight, `Scenarios only valid in ${nameR}`)
    addDefaultByScenarioSection(groupsByScenario.withDiffs, 'Scenarios producing differences')
    addDefaultByScenarioSection(groupsByScenario.withoutDiffs, 'No differences produced by the following scenarios')
  }

  // Build the by-dataset comparison sections
  const byDatasetSections: ComparisonSummarySectionViewModel[] = []
  function addByDatasetSection(
    rows: ComparisonReportSummaryRow[],
    headerText: string,
    initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
  ): void {
    const section = sectionViewModel('by-dataset', rows, headerText, initialState)
    if (section) {
      byDatasetSections.push(section)
    }
  }
  function addDefaultByDatasetSection(summaries: ComparisonGroupSummary[], headerText: string): void {
    const rows = summaries.map(groupSummary => ({ groupSummary }))
    addByDatasetSection(rows, headerText, 'expanded-if-diffs')
  }
  if (comparisonConfig.reportOptions?.summarySectionsForComparisonsByDataset) {
    // When a callback is defined, build the custom sections
    const customSections = comparisonConfig.reportOptions.summarySectionsForComparisonsByDataset(groupsByDataset)
    for (const customSection of customSections) {
      addByDatasetSection(customSection.rows, customSection.headerText, customSection.initialState)
    }
  } else {
    // Otherwise, build the default sections
    addDefaultByDatasetSection(groupsByDataset.withErrors, 'Datasets with errors')
    addDefaultByDatasetSection(groupsByDataset.onlyInLeft, 'Removed datasets')
    addDefaultByDatasetSection(groupsByDataset.onlyInRight, 'Added datasets')
    addDefaultByDatasetSection(groupsByDataset.withDiffs, 'Datasets with differences')
    addDefaultByDatasetSection(groupsByDataset.withoutDiffs, 'No differences detected for the following datasets')
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
      allRows: writable(allViewRows),
      rowsWithDiffs: viewRowsWithDiffs,
      sections: viewGroupSections
    }
  }

  // Helper function that determines the number of rows with differences
  function rowsWithDiffs(groupSummaries: ComparisonGroupSummariesByCategory): number {
    const rowsWithoutDiffsCount = groupSummaries.withoutDiffs?.length || 0
    return groupSummaries.allGroupSummaries.size - rowsWithoutDiffsCount
  }

  const byScenarioSummary = new ComparisonsByItemSummaryViewModel(
    pinnedItemStates.pinnedScenarios,
    'scenario',
    byScenarioSections,
    rowsWithDiffs(groupsByScenario)
  )

  const byDatasetSummary = new ComparisonsByItemSummaryViewModel(
    pinnedItemStates.pinnedDatasets,
    'dataset',
    byDatasetSections,
    rowsWithDiffs(groupsByDataset)
  )

  return {
    views: viewsSummary,
    byScenario: byScenarioSummary,
    byDataset: byDatasetSummary
  }
}
