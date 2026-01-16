// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import { derived, get, writable, type Readable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonDataset,
  ComparisonGraphId,
  ComparisonGroupSummary,
  ComparisonReportDetailItem,
  ComparisonReportDetailRow,
  ComparisonScenario,
  ComparisonScenarioKey,
  ComparisonSortMode,
  ComparisonTestSummary,
  ComparisonUnresolvedView,
  ComparisonView,
  ComparisonViewGroup,
  DatasetKey,
  GraphComparisonReport
} from '@sdeverywhere/check-core'
import { diffGraphs } from '@sdeverywhere/check-core'

import type { UserPrefs } from '../../../_shared/user-prefs'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { getBucketIndex } from '../_shared/buckets'
import type { PinnedItemState } from '../_shared/pinned-item-state'

import { groupItemsByTitle, scoreForSortMode } from './compare-detail-item'

import type { CompareDetailRowViewModel } from './compare-detail-row-vm'
import { createCompareDetailRowViewModel } from './compare-detail-row-vm'

import type { CompareGraphsRowViewModel } from './compare-graphs-row-vm'
import { createCompareGraphsRowViewModel } from './compare-graphs-row-vm'

export interface CompareGraphsSectionViewModel {
  /** The section title. */
  title: string
  /** The row view models. */
  rows: CompareGraphsRowViewModel[]
}

export interface CompareGraphsGroupedByDiffs {
  /** The section view models. */
  sections: CompareGraphsSectionViewModel[]
  /** The total number of graphs with changes (non-zero difference). */
  nonZeroDiffCount: number
  /** The breakdown of graph differences per bucket. */
  diffPercentByBucket: number[]
}

export type CompareDetailViewKind = 'scenario-view' | 'freeform-view' | 'scenario' | 'dataset'

export interface CompareDetailViewModel {
  kind: CompareDetailViewKind
  /** The unique key for the associated summary view row. */
  summaryRowKey: string
  /** The pretitle (e.g., view group title). */
  pretitle?: string
  /** The title (e.g., output variable name, scenario title, view title). */
  title: string
  /** The subtitle (e.g., output variable source name or scenario position). */
  subtitle?: string
  /** A string containing HTML `<span>` elements for annotations. */
  annotations?: string
  /** The string displayed above the list of related items. */
  relatedListHeader: string
  /** The related items for the dataset or scenario. */
  relatedItems: string[]
  /** The graph comparison sections in this group. */
  graphSections: CompareGraphsSectionViewModel[]
  /** The regular detail box rows in this group. */
  regularDetailRows: Readable<CompareDetailRowViewModel[]>
  /** The pinned detail box rows in this group. */
  pinnedDetailRows: Readable<CompareDetailRowViewModel[]>
  /** The shared pinned item state for this view. */
  pinnedItemState: PinnedItemState
}

export function createCompareDetailViewModelForUnresolvedView(
  summaryRowKey: string,
  viewGroup: ComparisonViewGroup,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _view: ComparisonUnresolvedView
): CompareDetailViewModel {
  return {
    kind: 'freeform-view',
    summaryRowKey,
    pretitle: viewGroup?.title,
    title: 'Unresolved view',
    annotations: undefined,
    relatedListHeader: '',
    relatedItems: [],
    graphSections: [],
    regularDetailRows: writable([]),
    pinnedDetailRows: writable([]),
    pinnedItemState: undefined
  }
}

export function createCompareDetailViewModelForFreeformView(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  baselineTestSummaries: Map<DatasetKey, ComparisonTestSummary>,
  userPrefs: UserPrefs,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  pinnedItemState: PinnedItemState
): CompareDetailViewModel {
  // Use the current sort mode.  It is OK to capture the current sort mode here because
  // we regenerate the detail rows whenever the sort mode changes.
  const sortMode = get(userPrefs.sortMode)

  // Create a detail row for each row spec
  const regularDetailRows: CompareDetailRowViewModel[] = []
  for (const rowSpec of view.rows || []) {
    const items: ComparisonReportDetailItem[] = []
    for (const boxSpec of rowSpec.boxes) {
      const detailItem: ComparisonReportDetailItem = {
        title: boxSpec.title,
        subtitle: boxSpec.subtitle,
        scenario: boxSpec.scenario,
        // XXX: For now we don't need to use the real test summary here (we can use
        // `md: 0` since the data and comparison will be loaded/performed on demand)
        testSummary: {
          d: boxSpec.dataset.key,
          s: boxSpec.scenario.key,
          md: 0
        }
      }
      items.push(detailItem)
    }

    const detailRow = createCompareDetailRowViewModel(
      comparisonConfig,
      dataCoordinator,
      baselineTestSummaries,
      userPrefs,
      sortMode,
      'freeform',
      rowSpec.title,
      rowSpec.subtitle,
      items
    )
    regularDetailRows.push(detailRow)
  }

  // Add rows at the top of the view for the pinned items
  const pinnedDetailRows = derived(pinnedItemState.orderedKeys, $pinnedItemKeys => {
    const rows: CompareDetailRowViewModel[] = []
    for (const pinnedItemKey of $pinnedItemKeys) {
      if (pinnedItemKey.startsWith('row')) {
        // Find the regular row for this key and clone it
        const regularRow = regularDetailRows.find(row => row.pinnedItemKey === pinnedItemKey)
        if (regularRow) {
          rows.push(
            cloneDetailRowViewModel(
              comparisonConfig,
              dataCoordinator,
              baselineTestSummaries,
              userPrefs,
              sortMode,
              regularRow
            )
          )
        }
      }
    }
    return rows
  })

  // For now the order of the detail rows is fixed in a freeform view, so we use
  // a constant writable store here
  const regularRows = writable(regularDetailRows)

  return {
    kind: 'freeform-view',
    summaryRowKey,
    pretitle: viewGroup?.title,
    title: view.title,
    subtitle: view.subtitle,
    annotations: undefined, // TODO
    relatedListHeader: '', // TODO
    relatedItems: [], // TODO
    graphSections: [],
    regularDetailRows: regularRows,
    pinnedDetailRows,
    pinnedItemState
  }
}

export function createCompareDetailViewModelForDataset(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  baselineTestSummaries: Map<DatasetKey, ComparisonTestSummary>,
  userPrefs: UserPrefs,
  groupSummary: ComparisonGroupSummary,
  pinnedItemState: PinnedItemState
): CompareDetailViewModel {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  // Get the primary dataset for the detail view
  const dataset = groupSummary.root as ComparisonDataset
  const outputVar = dataset.outputVarR || dataset.outputVarL
  const title = outputVar.varName
  const subtitle = outputVar.sourceName
  const annotations = getAnnotationsForDataset(dataset, bundleNameL, bundleNameR).join(' ')

  // Get the related graphs, etc; we only show the information relative to the "right" model
  const relatedItems: string[] = []
  function addRelatedItem(parts: string[]): void {
    const relatedItem = parts.join('&nbsp;<span class="related-sep">&gt;</span>&nbsp;')
    relatedItems.push(relatedItem)
  }
  if (outputVar.relatedItems) {
    for (const relatedItem of outputVar.relatedItems) {
      addRelatedItem(relatedItem.locationPath)
    }
  }

  // Helper function that finds a detail item for a given scenario key
  type GroupTitleAndDetailItem = [string, ComparisonReportDetailItem]
  function groupTitleAndDetailItemForScenarioKey(
    scenarioKey: ComparisonScenarioKey,
    groups: ComparisonReportDetailRow[]
  ): GroupTitleAndDetailItem | undefined {
    // TODO: Improve efficiency of looking up detail items
    for (const group of groups) {
      for (const item of group.items) {
        if (item.scenario.key === scenarioKey) {
          return [group.title, item]
        }
      }
    }
    return undefined
  }

  // Recompute the groups whenever the sort mode changes
  const sortedGroups = derived(userPrefs.sortMode, $sortMode => {
    // Group the scenarios by title (input variable name, typically), then sort by score
    let groups = groupItemsByTitle(comparisonConfig, groupSummary.group.testSummaries, 'scenario', $sortMode)

    if (comparisonConfig.reportOptions?.detailRowsForDataset) {
      // Apply custom ordering
      groups = comparisonConfig.reportOptions.detailRowsForDataset(groups)
    } else {
      // No custom ordering function was defined, so apply default ordering
      let allAtDefaultItem: ComparisonReportDetailItem
      const allInputsIndex = groups.findIndex(group => group.title === 'All inputs')
      if (allInputsIndex >= 0) {
        // Remove the "All inputs" row and move it to the top
        const allInputsRow = groups.splice(allInputsIndex, 1)[0]
        allAtDefaultItem = allInputsRow.items.find(item => {
          const settings = item.scenario.settings
          return settings.kind === 'all-inputs-settings' && settings.position === 'at-default'
        })
        groups.unshift(allInputsRow)
      }
      if (allAtDefaultItem) {
        allAtDefaultItem.title = '…at default'
        allAtDefaultItem.subtitle = undefined
      }

      // Customize the remaining rows
      for (const group of groups.slice(1)) {
        // Simplify the title for each item in the row
        for (const item of group.items) {
          item.title = `…${item.subtitle}`
          item.subtitle = undefined
        }

        // Make the "all at default" item always be the first item in each row
        const firstItem = group.items[0]
        if (firstItem !== allAtDefaultItem) {
          group.items.unshift(allAtDefaultItem)
        }
      }
    }

    return groups
  })

  // Derive the regular detail rows from the sorted groups
  const regularDetailRows = derived(sortedGroups, $sortedGroups => {
    // Use the current sort mode.  It is OK to capture the current sort mode here because
    // we regenerate the detail rows whenever the sort mode changes.
    const sortMode = get(userPrefs.sortMode)

    // Create a row view model for each group
    const rows: CompareDetailRowViewModel[] = []
    for (const group of $sortedGroups) {
      // TODO: For now put all grouped items in the same row.  Later we should make
      // this configurable so that items can be put in a different order or split
      // out into multiple rows.
      const detailRow = createCompareDetailRowViewModel(
        comparisonConfig,
        dataCoordinator,
        baselineTestSummaries,
        userPrefs,
        sortMode,
        'scenarios',
        group.title,
        group.subtitle,
        group.items
      )
      rows.push(detailRow)
    }
    return rows
  })

  // Add rows at the top of the view for the pinned items
  const pinnedDetailRows = derived(
    [sortedGroups, regularDetailRows, pinnedItemState.orderedKeys],
    ([$sortedGroups, $regularDetailRows, $pinnedItemKeys]) => {
      // Use the current sort mode.  It is OK to capture the current sort mode here because
      // we regenerate the detail rows whenever the sort mode changes.
      const sortMode = get(userPrefs.sortMode)

      const rows: CompareDetailRowViewModel[] = []
      for (const pinnedItemKey of $pinnedItemKeys) {
        if (pinnedItemKey.startsWith('row')) {
          // Find the regular row for this key and clone it
          const regularRow = $regularDetailRows.find(row => row.pinnedItemKey === pinnedItemKey)
          if (regularRow) {
            rows.push(
              cloneDetailRowViewModel(
                comparisonConfig,
                dataCoordinator,
                baselineTestSummaries,
                userPrefs,
                sortMode,
                regularRow
              )
            )
          }
        } else {
          // Find the scenario item for this key and create a row with a single scenario
          const item = groupTitleAndDetailItemForScenarioKey(pinnedItemKey, $sortedGroups)
          if (item) {
            const groupTitle = item[0]
            const detailItem = item[1]
            rows.push(
              createCompareDetailRowViewModel(
                comparisonConfig,
                dataCoordinator,
                baselineTestSummaries,
                userPrefs,
                sortMode,
                'scenarios',
                groupTitle,
                undefined, // TODO: Subtitle?
                [detailItem]
              )
            )
          }
        }
      }
      return rows
    }
  )

  return {
    kind: 'dataset',
    summaryRowKey,
    title,
    subtitle,
    annotations,
    relatedListHeader: 'Appears in:',
    relatedItems,
    graphSections: [],
    regularDetailRows,
    pinnedDetailRows,
    pinnedItemState
  }
}

export function createCompareDetailViewModelForScenario(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  baselineTestSummaries: Map<DatasetKey, ComparisonTestSummary>,
  userPrefs: UserPrefs,
  groupSummary: ComparisonGroupSummary,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  pinnedItemState: PinnedItemState
): CompareDetailViewModel {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  // Get the primary scenario for the detail view
  const scenario = groupSummary.root as ComparisonScenario
  const annotations = getAnnotationsForScenario(scenario, bundleNameL, bundleNameR).join(' ')

  let kind: CompareDetailViewKind
  let pretitle: string
  let title: string
  let subtitle: string
  if (view) {
    // This is the detail screen for a user-defined view, so use the title/subtitle from
    // the view definition
    kind = 'scenario-view'
    pretitle = viewGroup?.title
    title = view.title
    subtitle = view.subtitle
  } else {
    // This is the detail screen for a scenario, so use the title/subtitle from the scenario
    kind = 'scenario'
    title = scenario.title
    subtitle = scenario.subtitle
  }

  // Include the related sliders
  const relatedItems: string[] = []
  function addRelatedItem(parts: string[]): void {
    const relatedItem = parts.join('&nbsp;<span class="related-sep">&gt;</span>&nbsp;')
    relatedItems.push(relatedItem)
  }
  if (scenario.settings.kind === 'input-settings') {
    // For now, show related sliders for the "right" model only
    for (const input of scenario.settings.inputs) {
      const inputVar = input.stateR.inputVar
      if (inputVar?.relatedItem) {
        addRelatedItem(inputVar.relatedItem.locationPath)
      }
    }
  }

  // Recompute the regular detail rows whenever the sort mode changes
  const regularDetailRows = derived(userPrefs.sortMode, $sortMode => {
    // Put each dataset item into its own row
    const testSummaries = groupSummary.group.testSummaries
    let groups: ComparisonReportDetailRow[] = []
    for (const testSummary of testSummaries) {
      const scenario = comparisonConfig.scenarios.getScenario(testSummary.s)
      if (scenario === undefined) {
        continue
      }

      const dataset = comparisonConfig.datasets.getDataset(testSummary.d)
      if (dataset === undefined) {
        continue
      }

      // TODO: Include both old and new names here, if applicable
      const outputVar = dataset.outputVarR || dataset.outputVarL

      const detailItem: ComparisonReportDetailItem = {
        title: outputVar.varName,
        subtitle: outputVar.sourceName,
        scenario,
        testSummary
      }

      groups.push({
        title: '',
        score: scoreForSortMode(testSummary, $sortMode) || 0,
        items: [detailItem]
      })
    }

    // Sort datasets by score (highest score at top), then alphabetically by dataset name
    groups = groups.sort((a, b) => {
      const aFirstItem = a.items[0]
      const bFirstItem = b.items[0]
      const aScore = a.score
      const bScore = b.score
      if (aScore !== bScore) {
        // Sort by score first
        return aScore > bScore ? -1 : 1
      } else {
        // Sort by dataset name alphabetically
        // TODO: Also sort by source name?
        const aDatasetName = aFirstItem.title.toLowerCase()
        const bDatasetName = bFirstItem.title.toLowerCase()
        return aDatasetName.localeCompare(bDatasetName)
      }
    })

    if (comparisonConfig.reportOptions?.detailRowsForScenario) {
      // Apply custom ordering
      groups = comparisonConfig.reportOptions.detailRowsForScenario(groups)
    }

    // Use the current sort mode.  It is OK to capture the current sort mode here because
    // we regenerate the detail rows whenever the sort mode changes.
    const sortMode = get(userPrefs.sortMode)

    // Create a row view model for each group
    const rows: CompareDetailRowViewModel[] = []
    for (const group of groups) {
      const detailRow = createCompareDetailRowViewModel(
        comparisonConfig,
        dataCoordinator,
        baselineTestSummaries,
        userPrefs,
        sortMode,
        'datasets',
        group.title,
        group.subtitle,
        group.items
      )
      rows.push(detailRow)
    }

    return rows
  })

  // Add rows at the top of the view for the pinned items
  const pinnedDetailRows = derived(
    [regularDetailRows, pinnedItemState.orderedKeys],
    ([$regularDetailRows, $pinnedDatasetKeys]) => {
      // Use the current sort mode.  It is OK to capture the current sort mode here because
      // we regenerate the detail rows whenever the sort mode changes.
      const sortMode = get(userPrefs.sortMode)

      const detailRowForDatasetKey = (datasetKey: DatasetKey) => {
        // TODO: Improve efficiency of looking up detail items
        return $regularDetailRows.find(row => row.items[0].testSummary.d === datasetKey)
      }

      const rows: CompareDetailRowViewModel[] = []
      for (const datasetKey of $pinnedDatasetKeys) {
        // Find the item for this dataset key
        const regularRow = detailRowForDatasetKey(datasetKey)
        if (regularRow) {
          // Clone the regular row view model so the pinned row view model is distinct
          rows.push(
            cloneDetailRowViewModel(
              comparisonConfig,
              dataCoordinator,
              baselineTestSummaries,
              userPrefs,
              sortMode,
              regularRow
            )
          )
        }
      }
      return rows
    }
  )

  // Add the compared graphs at top, if defined for the given view
  let graphSections: CompareGraphsSectionViewModel[]
  if (view) {
    const testSummaries = groupSummary.group.testSummaries
    graphSections = createCompareGraphsSectionViewModels(comparisonConfig, dataCoordinator, view, testSummaries)
  } else {
    graphSections = []
  }

  return {
    kind,
    summaryRowKey,
    pretitle,
    title,
    subtitle,
    annotations,
    relatedListHeader: 'Related items:',
    relatedItems,
    graphSections,
    regularDetailRows,
    pinnedDetailRows,
    pinnedItemState
  }
}

function createCompareGraphsSectionViewModels(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  view: ComparisonView,
  testSummaries: ComparisonTestSummary[]
): CompareGraphsSectionViewModel[] {
  // TODO: We don't yet support including user graphs in a freeform view, so treat this
  // as an error for now.  Technically it is possible to support this, but we would need
  // to change the schema to allow for specifying which scenario to use for each graph.
  if (view.rows !== undefined) {
    throw new Error('Graphs section is not yet supported in a freeform view')
  }

  // No sections when there are no graphs
  if (view.graphIds.length === 0) {
    return []
  }

  if (view.graphOrder === 'grouped-by-diffs') {
    // Group the graphs into sections (added, removed, etc) and order by the number/magnitude
    // of differences
    const grouped = getGraphsGroupedByDiffs(
      comparisonConfig,
      dataCoordinator,
      view.scenario,
      testSummaries,
      view.graphIds
    )
    return grouped.sections
  } else {
    // Show the graphs in a single "Featured graphs" section
    const graphSpecsL = comparisonConfig.bundleL.modelSpec.graphSpecs
    const graphSpecsR = comparisonConfig.bundleR.modelSpec.graphSpecs
    const scenario = view.scenario
    const rows: CompareGraphsRowViewModel[] = []
    for (const graphId of view.graphIds) {
      const graphL = graphSpecsL?.find(s => s.id === graphId)
      const graphR = graphSpecsR?.find(s => s.id === graphId)
      const graphReport = diffGraphs(graphL, graphR, scenario.key, testSummaries)
      rows.push(createCompareGraphsRowViewModel(comparisonConfig, dataCoordinator, scenario, graphId, graphReport))
    }
    return [
      {
        title: 'Featured graphs',
        rows
      }
    ]
  }
}

export function getGraphsGroupedByDiffs(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  scenario: ComparisonScenario,
  testSummaries: ComparisonTestSummary[],
  graphIds: ComparisonGraphId[]
): CompareGraphsGroupedByDiffs {
  // Prepare the groups
  const added: CompareGraphsRowViewModel[] = []
  const removed: CompareGraphsRowViewModel[] = []
  const metadataAndDatasets: CompareGraphsRowViewModel[] = []
  const metadataOnly: CompareGraphsRowViewModel[] = []
  const datasetsOnly: CompareGraphsRowViewModel[] = []
  const unchanged: CompareGraphsRowViewModel[] = []

  // Compare the graphs
  const graphSpecsL = comparisonConfig.bundleL.modelSpec.graphSpecs
  const graphSpecsR = comparisonConfig.bundleR.modelSpec.graphSpecs
  const diffCountByBucket = Array(comparisonConfig.thresholds.length + 3).fill(0)
  for (const graphId of graphIds) {
    const graphL = graphSpecsL?.find(s => s.id === graphId)
    const graphR = graphSpecsR?.find(s => s.id === graphId)
    const graphReport = diffGraphs(graphL, graphR, scenario.key, testSummaries)
    const maxDiffPct = maxDiffPctForGraph(graphReport)
    const row = createCompareGraphsRowViewModel(comparisonConfig, dataCoordinator, scenario, graphId, graphReport)

    // Determine which section the row will be added to
    let bucketIndex: number
    switch (graphReport.inclusion) {
      case 'right-only':
        // Use "yellow" bucket for added graphs
        bucketIndex = 1
        added.push(row)
        break
      case 'left-only':
        // Use "yellow" bucket for removed graphs
        bucketIndex = 1
        removed.push(row)
        break
      case 'both':
        if (maxDiffPct > 0) {
          // Use the appropriate bucket for graphs with dataset changes
          bucketIndex = getBucketIndex(maxDiffPct, comparisonConfig.thresholds)
          if (graphReport.metadataReports.length > 0) {
            metadataAndDatasets.push(row)
          } else {
            datasetsOnly.push(row)
          }
        } else {
          if (graphReport.metadataReports.length > 0) {
            // Use "yellow" bucket for graphs with metadata changes only
            bucketIndex = 1
            metadataOnly.push(row)
          } else {
            // Use "green" bucket for graphs with no changes
            bucketIndex = 0
            unchanged.push(row)
          }
        }
        break
      case 'neither':
        // This shouldn't happen in practice
        bucketIndex = 0
        unchanged.push(row)
        break
      default:
        assertNever(graphReport.inclusion)
    }

    // Increment the count for the chosen bucket
    diffCountByBucket[bucketIndex]++
  }

  // Get the percentage of diffs for each bucket relative to the total number of graphs
  const totalGraphCount = graphIds.length
  const nonZeroDiffCount = totalGraphCount - diffCountByBucket[0]
  const diffPercentByBucket = diffCountByBucket.map(count => (count / totalGraphCount) * 100)

  // Add a section for each non-empty group
  const sections: CompareGraphsSectionViewModel[] = []
  function addSection(rows: CompareGraphsRowViewModel[], title: string, sort: boolean) {
    if (rows.length > 0) {
      const sortedRows = sort ? rows.sort((a, b) => (a.maxDiffPct > b.maxDiffPct ? -1 : 1)) : rows
      sections.push({
        title,
        rows: sortedRows
      })
    }
  }
  addSection(added, 'Added graphs', false)
  addSection(removed, 'Removed graphs', false)
  addSection(metadataAndDatasets, 'Graphs with metadata and dataset changes', true)
  addSection(metadataOnly, 'Graphs with metadata changes only', false)
  addSection(datasetsOnly, 'Graphs with dataset changes only', true)
  addSection(unchanged, 'Unchanged graphs', false)

  return {
    sections,
    nonZeroDiffCount,
    diffPercentByBucket
  }
}

function maxDiffPctForGraph(graphReport: GraphComparisonReport): number {
  let maxDiffPct = 0
  for (const datasetReport of graphReport.datasetReports) {
    if (datasetReport.maxDiff !== undefined && datasetReport.maxDiff > maxDiffPct) {
      maxDiffPct = datasetReport.maxDiff
    }
  }
  return maxDiffPct
}

function cloneDetailRowViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  baselineTestSummaries: Map<DatasetKey, ComparisonTestSummary>,
  userPrefs: UserPrefs,
  sortMode: ComparisonSortMode,
  row: CompareDetailRowViewModel
): CompareDetailRowViewModel {
  return createCompareDetailRowViewModel(
    comparisonConfig,
    dataCoordinator,
    baselineTestSummaries,
    userPrefs,
    sortMode,
    row.kind,
    row.title,
    row.subtitle,
    row.items
  )
}
