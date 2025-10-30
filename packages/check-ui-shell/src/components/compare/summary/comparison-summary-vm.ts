// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { derived, writable, type Readable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonReportSummaryRow,
  ComparisonScenarioKey,
  ComparisonScenarioTitleSpec,
  ComparisonSortMode,
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
import type { ComparisonCategorizedResults } from '@sdeverywhere/check-core'

export class ComparisonViewsSummaryViewModel {
  public readonly kind = 'views'

  private allRows: ComparisonSummaryRowViewModel[]

  constructor(
    public readonly sections: Readable<ComparisonSummarySectionViewModel[]>,
    public readonly rowsWithDiffs: Readable<number>
  ) {
    // Derive a flat array containing all rows from the sections
    const allViewRows = derived(sections, $sections => {
      const rows: ComparisonSummaryRowViewModel[] = []
      for (const viewGroupSection of $sections) {
        rows.push(...viewGroupSection.rows)
      }
      return rows
    })

    // Save a static array of all rows whenever the underlying row store is updated.
    // The static array is needed so that it can be accessed to find the next/previous
    // row when navigating between rows.
    allViewRows.subscribe(rows => {
      this.allRows = rows
    })
  }

  /**
   * Return the static array of all view rows.
   */
  public getAllRows(): ComparisonSummaryRowViewModel[] {
    return this.allRows
  }
}

export class ComparisonsByItemSummaryViewModel {
  public readonlykind = 'by-item'

  public readonly pinnedRows: Readable<ComparisonSummaryRowViewModel[]>
  private allRows: ComparisonSummaryRowViewModel[]

  constructor(
    public readonly itemKind: 'scenario' | 'dataset',
    public readonly sections: Readable<ComparisonSummarySectionViewModel[]>,
    public readonly rowsWithDiffs: Readable<number>,
    private readonly pinnedItemState: PinnedItemState
  ) {
    // Derive a flat array of regular row view models from the sections
    const regularRows = derived(sections, $sections => {
      const regularRows: ComparisonSummaryRowViewModel[] = []
      for (const section of $sections) {
        regularRows.push(...section.rows)
      }
      return regularRows
    })

    // Derive the pinned row view models from the pinned item state
    this.pinnedRows = derived([regularRows, pinnedItemState.orderedKeys], ([$regularRows, $orderedKeys]) => {
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
        const regularRow = $regularRows.find(row => row.itemKey === itemKey)
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

    // Save a static array of all rows (pinned rows + regular rows) whenever the underlying
    // row stores are updated.  The static array is needed so that it can be accessed to
    // find the next/previous row when navigating between rows.
    const allRows = derived([this.pinnedRows, regularRows], ([$pinnedRows, $regularRows]) => {
      return [...$pinnedRows, ...$regularRows]
    })
    allRows.subscribe(rows => {
      this.allRows = rows
    })
  }

  /**
   * Return the static array of all rows (pinned rows + regular rows).
   */
  public getAllRows(): ComparisonSummaryRowViewModel[] {
    return this.allRows
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
  skippedScenarioCount: Readable<number>
}

export function createComparisonSummaryViewModels(
  comparisonConfig: ComparisonConfig,
  pinnedItemStates: PinnedItemStates,
  terseSummaries: ComparisonTestSummary[],
  sortMode: Readable<ComparisonSortMode>,
  skipComparisonScenarios: ComparisonScenarioTitleSpec[] = []
): ComparisonSummaryViewModels {
  // Helper function to check if a scenario was skipped
  function isScenarioSkipped(scenarioTitle: string, scenarioSubtitle?: string): boolean {
    return skipComparisonScenarios.some(
      skipped => skipped.title === scenarioTitle && skipped.subtitle === scenarioSubtitle
    )
  }

  // Helper function that determines the number of skipped scenarios
  function rowsSkipped(groupSummaries: ComparisonGroupSummariesByCategory): number {
    let skippedCount = 0
    for (const groupSummary of groupSummaries.allGroupSummaries.values()) {
      if (
        groupSummary.root.kind === 'scenario' &&
        isScenarioSkipped(groupSummary.root.title, groupSummary.root.subtitle)
      ) {
        skippedCount++
      }
    }
    return skippedCount
  }

  // Group and categorize the comparison results when the sort mode changes
  const comparisonGroups = derived(sortMode, $sortMode =>
    categorizeComparisonTestSummaries(comparisonConfig, terseSummaries, $sortMode)
  )

  // Create the view model for the "Comparison views" summary tab (only if views are defined)
  let viewsSummary: ComparisonViewsSummaryViewModel | undefined
  if (comparisonConfig.viewGroups.length > 0) {
    viewsSummary = createComparisonViewsSummaryViewModel(comparisonConfig, comparisonGroups)
  }

  // Create the view model for the "Comparisons by scenario" summary tab
  const groupsByScenario = derived(comparisonGroups, $groups => $groups.byScenario)
  const byScenarioSummary = createByScenarioSummaryViewModel(comparisonConfig, groupsByScenario, pinnedItemStates)

  // Create the view model for the "Comparisons by dataset" summary tab
  const groupsByDataset = derived(comparisonGroups, $groups => $groups.byDataset)
  const byDatasetSummary = createByDatasetSummaryViewModel(comparisonConfig, groupsByDataset, pinnedItemStates)

  // Derive the number of skipped scenarios
  const skippedScenarioCount = derived(groupsByScenario, $groupsByScenario => rowsSkipped($groupsByScenario))

  return {
    views: viewsSummary,
    byScenario: byScenarioSummary,
    byDataset: byDatasetSummary,
    skippedScenarioCount
  }
}

/**
 * Create a summary row view model for a single-scenario comparison view.
 */
function createRowViewModelForComparisonViewWithScenario(
  comparisonConfig: ComparisonConfig,
  view: ComparisonView,
  viewGroup: ComparisonViewGroup,
  groupSummary: ComparisonGroupSummary
): ComparisonSummaryRowViewModel {
  // Get the comparison test results for the scenario used in this view
  const scenario = view.scenario
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

/**
 * Create a summary row view model for a comparison view that has freeform rows.
 */
function createRowViewModelForComparisonViewWithFreeformRows(
  comparisonConfig: ComparisonConfig,
  view: ComparisonView,
  viewGroup: ComparisonViewGroup,
  allTestSummaries: ComparisonTestSummary[]
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
  // TODO: For now, we only sort by `maxDiff` here; this should be changed to use the active sort mode
  const scoresForView = getScoresForTestSummaries(testSummariesForView, comparisonConfig.thresholds, 'max-diff')
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

/**
 * Create a summary row view model for a given report row.
 */
function createRowViewModelForReportRow(
  row: ComparisonReportSummaryRow,
  bundleNameL: string,
  bundleNameR: string
): ComparisonSummaryRowViewModel {
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

/**
 * Create a section view model with the given set of rows.
 */
function createSectionViewModel(
  kind: ComparisonGroupingKind,
  rows: ComparisonReportSummaryRow[],
  bundleNameL: string,
  bundleNameR: string,
  headerText: string,
  initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
): ComparisonSummarySectionViewModel | undefined {
  if (rows.length === 0) {
    // Exclude sections that have no rows
    return undefined
  }

  // Create a view model for each row
  const rowViewModels: ComparisonSummaryRowViewModel[] = rows.map(row => {
    return createRowViewModelForReportRow(row, bundleNameL, bundleNameR)
  })

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

/**
 * Return the number of rows with differences for a given set of group summaries.
 */
function rowsWithDiffs(groupSummaries: Readable<ComparisonGroupSummariesByCategory>): Readable<number> {
  return derived(groupSummaries, $groupSummaries => {
    const rowsWithoutDiffsCount = $groupSummaries.withoutDiffs?.length || 0
    return $groupSummaries.allGroupSummaries.size - rowsWithoutDiffsCount
  })
}

/**
 * Create a view model for the "Comparison views" summary tab.
 */
function createComparisonViewsSummaryViewModel(
  comparisonConfig: ComparisonConfig,
  comparisonGroups: Readable<ComparisonCategorizedResults>
): ComparisonViewsSummaryViewModel {
  // XXX: For now we compute these together in one `derived`, then derive the individual fields
  interface ComparisonViewsInfo {
    viewRowsWithDiffs: number
    viewGroupSections: ComparisonSummarySectionViewModel[]
  }

  // Create summary row view models for each comparison view.  Rebuild when the underlying data is
  // updated, for example when the sort mode changes.
  const info: Readable<ComparisonViewsInfo> = derived(comparisonGroups, $comparisonGroups => {
    const $groupsByScenario = $comparisonGroups.byScenario
    const $allTestSummaries = $comparisonGroups.allTestSummaries

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
              const groupSummary = $groupsByScenario.allGroupSummaries.get(view.scenario.key)
              summaryRow = createRowViewModelForComparisonViewWithScenario(
                comparisonConfig,
                view,
                viewGroup,
                groupSummary
              )
            } else {
              summaryRow = createRowViewModelForComparisonViewWithFreeformRows(
                comparisonConfig,
                view,
                viewGroup,
                $allTestSummaries
              )
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
    return {
      viewRowsWithDiffs,
      viewGroupSections
    }
  })

  // Create the view model for the "Comparison views" summary tab
  const sections = derived(info, $info => $info.viewGroupSections)
  const rowsWithDiffs = derived(info, $info => $info.viewRowsWithDiffs)
  return new ComparisonViewsSummaryViewModel(sections, rowsWithDiffs)
}

/**
 * Create a view model for the "Comparisons by scenario" summary tab.
 */
function createByScenarioSummaryViewModel(
  comparisonConfig: ComparisonConfig,
  groupsByScenario: Readable<ComparisonGroupSummariesByCategory>,
  pinnedItemStates: PinnedItemStates
): ComparisonsByItemSummaryViewModel {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name
  const nameL = datasetSpan(bundleNameL, 'left')
  const nameR = datasetSpan(bundleNameR, 'right')

  function addSection(
    sections: ComparisonSummarySectionViewModel[],
    rows: ComparisonReportSummaryRow[],
    headerText: string,
    initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
  ): void {
    const section = createSectionViewModel('by-scenario', rows, bundleNameL, bundleNameR, headerText, initialState)
    if (section) {
      sections.push(section)
    }
  }

  function addDefaultSection(
    sections: ComparisonSummarySectionViewModel[],
    summaries: ComparisonGroupSummary[],
    headerText: string
  ): void {
    const rows = summaries.map(groupSummary => ({ groupSummary }))
    addSection(sections, rows, headerText, 'expanded-if-diffs')
  }

  // Derive the by-scenario comparison sections when the sort mode changes
  const byScenarioSections = derived(groupsByScenario, $groupsByScenario => {
    const sections: ComparisonSummarySectionViewModel[] = []
    if (comparisonConfig.reportOptions?.summarySectionsForComparisonsByScenario) {
      // When a callback is defined, build the custom sections
      const customSections = comparisonConfig.reportOptions.summarySectionsForComparisonsByScenario($groupsByScenario)
      for (const customSection of customSections) {
        addSection(sections, customSection.rows, customSection.headerText, customSection.initialState)
      }
    } else {
      // Otherwise, build the default sections
      addDefaultSection(sections, $groupsByScenario.withErrors, 'Scenarios with errors')
      addDefaultSection(sections, $groupsByScenario.onlyInLeft, `Scenarios only valid in ${nameL}`)
      addDefaultSection(sections, $groupsByScenario.onlyInRight, `Scenarios only valid in ${nameR}`)
      addDefaultSection(sections, $groupsByScenario.withDiffs, 'Scenarios producing differences')
      addDefaultSection(sections, $groupsByScenario.withoutDiffs, 'No differences produced by the following scenarios')
    }
    return sections
  })

  // Create the view model for the "Comparisons by scenario" summary tab
  return new ComparisonsByItemSummaryViewModel(
    'scenario',
    byScenarioSections,
    rowsWithDiffs(groupsByScenario),
    pinnedItemStates.pinnedScenarios
  )
}

/**
 * Create a view model for the "Comparisons by dataset" summary tab.
 */
function createByDatasetSummaryViewModel(
  comparisonConfig: ComparisonConfig,
  groupsByDataset: Readable<ComparisonGroupSummariesByCategory>,
  pinnedItemStates: PinnedItemStates
): ComparisonsByItemSummaryViewModel {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  function addSection(
    sections: ComparisonSummarySectionViewModel[],
    rows: ComparisonReportSummaryRow[],
    headerText: string,
    initialState: 'collapsed' | 'expanded' | 'expanded-if-diffs' | undefined
  ): void {
    const section = createSectionViewModel('by-dataset', rows, bundleNameL, bundleNameR, headerText, initialState)
    if (section) {
      sections.push(section)
    }
  }

  function addDefaultSection(
    sections: ComparisonSummarySectionViewModel[],
    summaries: ComparisonGroupSummary[],
    headerText: string
  ): void {
    const rows = summaries.map(groupSummary => ({ groupSummary }))
    addSection(sections, rows, headerText, 'expanded-if-diffs')
  }

  // Derive the by-dataset comparison sections when the sort mode changes
  const byDatasetSections = derived(groupsByDataset, $groupsByDataset => {
    const sections: ComparisonSummarySectionViewModel[] = []
    if (comparisonConfig.reportOptions?.summarySectionsForComparisonsByDataset) {
      // When a callback is defined, build the custom sections
      const customSections = comparisonConfig.reportOptions.summarySectionsForComparisonsByDataset($groupsByDataset)
      for (const customSection of customSections) {
        addSection(sections, customSection.rows, customSection.headerText, customSection.initialState)
      }
    } else {
      // Otherwise, build the default sections
      addDefaultSection(sections, $groupsByDataset.withErrors, 'Datasets with errors')
      addDefaultSection(sections, $groupsByDataset.onlyInLeft, 'Removed datasets')
      addDefaultSection(sections, $groupsByDataset.onlyInRight, 'Added datasets')
      addDefaultSection(sections, $groupsByDataset.withDiffs, 'Datasets with differences')
      addDefaultSection(sections, $groupsByDataset.withoutDiffs, 'No differences detected for the following datasets')
    }
    return sections
  })

  // Create the view model for the "Comparisons by dataset" summary tab
  return new ComparisonsByItemSummaryViewModel(
    'dataset',
    byDatasetSections,
    rowsWithDiffs(groupsByDataset),
    pinnedItemStates.pinnedDatasets
  )
}

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
