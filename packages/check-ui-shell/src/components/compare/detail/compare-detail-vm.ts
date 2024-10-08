// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type {
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonDataset,
  ComparisonGraphId,
  ComparisonGroupSummary,
  ComparisonScenario,
  ComparisonScenarioKey,
  ComparisonTestSummary,
  ComparisonView,
  ComparisonViewGroup,
  DatasetKey,
  GraphComparisonReport
} from '@sdeverywhere/check-core'
import { diffGraphs } from '@sdeverywhere/check-core'

import type { UserPrefs } from '../../../_shared/user-prefs'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { getBucketIndex } from '../_shared/buckets'
import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'

import type { ComparisonDetailItem } from './compare-detail-item'
import { groupItemsByTitle } from './compare-detail-item'

import type { CompareDetailRowViewModel } from './compare-detail-row-vm'
import { createCompareDetailRowViewModel, createCompareDetailSeparatorRowViewModel } from './compare-detail-row-vm'

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

export interface CompareDetailViewModel {
  kind: ComparisonGroupingKind
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
  /** The detail box rows in this group. */
  detailRows: CompareDetailRowViewModel[]
}

export function createCompareDetailViewModel(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  userPrefs: UserPrefs,
  groupSummary: ComparisonGroupSummary,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  pinnedItemKeys: string[] | undefined
): CompareDetailViewModel {
  switch (groupSummary.group.kind) {
    case 'by-dataset':
      return createCompareDetailViewModelForDataset(
        summaryRowKey,
        comparisonConfig,
        dataCoordinator,
        userPrefs,
        groupSummary,
        pinnedItemKeys
      )
    case 'by-scenario':
      return createCompareDetailViewModelForScenario(
        summaryRowKey,
        comparisonConfig,
        dataCoordinator,
        userPrefs,
        groupSummary,
        viewGroup,
        view,
        pinnedItemKeys
      )
    default:
      assertNever(groupSummary.group.kind)
  }
}

function createCompareDetailViewModelForDataset(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  userPrefs: UserPrefs,
  groupSummary: ComparisonGroupSummary,
  pinnedScenarioKeys: ComparisonScenarioKey[] | undefined
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

  // Group the scenarios by title (input variable name, typically), then sort by score
  const groups = groupItemsByTitle(comparisonConfig, groupSummary.group.testSummaries, 'scenario')

  // Pull out the "all at default" item; for now we make it the first item in each row
  // TODO: Make this more configurable
  let allAtDefaultItem: ComparisonDetailItem
  for (const group of groups) {
    for (const item of group.items) {
      if (item.scenario.settings.kind === 'all-inputs-settings' && item.scenario.settings.position === 'at-default') {
        allAtDefaultItem = item
        break
      }
    }
  }

  // Create a row for each group
  const detailRows: CompareDetailRowViewModel[] = []
  for (const group of groups) {
    // TODO: For now put all grouped items in the same row, and make the "all at
    // default" item always be the first item in the row.  Later we should make
    // this configurable so that items can be put in a different order or split
    // out into multiple rows.
    const items = group.items[0] !== allAtDefaultItem ? [allAtDefaultItem, ...group.items] : group.items
    const detailRow = createCompareDetailRowViewModel(
      comparisonConfig,
      dataCoordinator,
      userPrefs,
      'scenarios',
      group.title,
      undefined, // TODO: Subtitle?
      items
    )
    detailRows.push(detailRow)
  }

  // For now, always put the "all inputs" row at top
  // TODO: Use a more stable way to identify the row (without using the title)
  const allInputsRowIndex = detailRows.findIndex(row => row.title === 'All inputs')
  if (allInputsRowIndex !== undefined) {
    const allInputsRow = detailRows.splice(allInputsRowIndex, 1)[0]
    detailRows.unshift(allInputsRow)
  }

  // Add rows at the top of the view for the pinned items
  type GroupTitleAndDetailItem = [string, ComparisonDetailItem]
  function groupTitleAndDetailItemForScenarioKey(
    scenarioKey: ComparisonScenarioKey
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
  if (pinnedScenarioKeys?.length > 0) {
    const pinnedDetailRows: CompareDetailRowViewModel[] = []
    for (const scenarioKey of pinnedScenarioKeys) {
      // Find the item for this scenario key
      const item = groupTitleAndDetailItemForScenarioKey(scenarioKey)
      if (item) {
        pinnedDetailRows.push(
          createCompareDetailRowViewModel(
            comparisonConfig,
            dataCoordinator,
            userPrefs,
            'scenarios',
            item[0],
            undefined, // TODO: Subtitle?
            [item[1]]
          )
        )
      }
    }
    // TODO: If the test config customizes which scenarios are displayed in this detail view,
    // the pinned scenarios may not be available.  For now, in this case, we won't show any
    // pinned scenarios, but should we?  Or at least show an empty row to keep a consistent
    // position?
    if (pinnedDetailRows.length > 0) {
      pinnedDetailRows.push(createCompareDetailSeparatorRowViewModel())
      detailRows.unshift(...pinnedDetailRows)
    }
  }

  return {
    kind: 'by-dataset',
    summaryRowKey,
    title,
    subtitle,
    annotations,
    relatedListHeader: 'Appears in:',
    relatedItems,
    graphSections: [],
    detailRows
  }
}

function createCompareDetailViewModelForScenario(
  summaryRowKey: string,
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  userPrefs: UserPrefs,
  groupSummary: ComparisonGroupSummary,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  pinnedDatasetKeys: DatasetKey[] | undefined
): CompareDetailViewModel {
  const bundleNameL = comparisonConfig.bundleL.name
  const bundleNameR = comparisonConfig.bundleR.name

  // Get the primary scenario for the detail view
  const scenario = groupSummary.root as ComparisonScenario
  const annotations = getAnnotationsForScenario(scenario, bundleNameL, bundleNameR).join(' ')

  let kind: ComparisonGroupingKind
  let pretitle: string
  let title: string
  let subtitle: string
  if (view) {
    // This is the detail screen for a user-defined view, so use the title/subtitle from
    // the view definition
    kind = 'views'
    pretitle = viewGroup?.title
    title = view.title
    subtitle = view.subtitle
  } else {
    // This is the detail screen for a scenario, so use the title/subtitle from the scenario
    kind = 'by-scenario'
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

  // Create one box/row for each dataset in the group
  interface Row {
    viewModel: CompareDetailRowViewModel
    detailItem: ComparisonDetailItem
    maxDiff: number
  }
  const rows: Row[] = []
  for (const testSummary of groupSummary.group.testSummaries) {
    const scenario = comparisonConfig.scenarios.getScenario(testSummary.s)
    if (scenario === undefined) {
      continue
    }

    const dataset = comparisonConfig.datasets.getDataset(testSummary.d)
    // TODO: Include both old and new names here, if applicable
    const outputVar = dataset.outputVarR || dataset.outputVarL

    const detailItem: ComparisonDetailItem = {
      title: outputVar.varName,
      subtitle: outputVar.sourceName,
      scenario,
      testSummary
    }

    const rowViewModel = createCompareDetailRowViewModel(
      comparisonConfig,
      dataCoordinator,
      userPrefs,
      'datasets',
      title,
      subtitle,
      [detailItem]
    )

    rows.push({
      viewModel: rowViewModel,
      detailItem,
      maxDiff: testSummary.md
    })
  }

  // Sort rows by score (highest score at top), then alphabetically by dataset name
  const sortedRows = rows.sort((a, b) => {
    const aScore = a.maxDiff
    const bScore = b.maxDiff
    if (aScore !== bScore) {
      // Sort by score first
      return aScore > bScore ? -1 : 1
    } else {
      // Sort by dataset name alphabetically
      // TODO: Also sort by source name?
      const aDatasetName = a.viewModel.title.toLowerCase()
      const bDatasetName = b.viewModel.title.toLowerCase()
      return aDatasetName.localeCompare(bDatasetName)
    }
  })
  const normalDetailRows = sortedRows.map(row => row.viewModel)

  // Add rows at the top of the view for the pinned items
  function detailRowForDatasetKey(datasetKey: DatasetKey): Row | undefined {
    // TODO: Improve efficiency of looking up detail items
    for (const row of rows) {
      if (row.detailItem.testSummary.d === datasetKey) {
        return row
      }
    }
    return undefined
  }
  const pinnedDetailRows: CompareDetailRowViewModel[] = []
  if (pinnedDatasetKeys?.length > 0) {
    for (const datasetKey of pinnedDatasetKeys) {
      // Find the item for this dataset key
      const detailRow = detailRowForDatasetKey(datasetKey)
      if (detailRow) {
        pinnedDetailRows.push(detailRow.viewModel)
      }
    }
    if (pinnedDetailRows.length > 0) {
      pinnedDetailRows.push(createCompareDetailSeparatorRowViewModel())
    }
  }

  // Add the normal rows after the pinned rows
  const detailRows = pinnedDetailRows.length > 0 ? pinnedDetailRows : []
  detailRows.push(...normalDetailRows)

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
    detailRows
  }
}

function createCompareGraphsSectionViewModels(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  view: ComparisonView,
  testSummaries: ComparisonTestSummary[]
): CompareGraphsSectionViewModel[] {
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
    const graphSpecsL = comparisonConfig.bundleL.model.modelSpec.graphSpecs
    const graphSpecsR = comparisonConfig.bundleR.model.modelSpec.graphSpecs
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
  const graphSpecsL = comparisonConfig.bundleL.model.modelSpec.graphSpecs
  const graphSpecsR = comparisonConfig.bundleR.model.modelSpec.graphSpecs
  const diffCountByBucket = Array(comparisonConfig.thresholds.length + 2).fill(0)
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
