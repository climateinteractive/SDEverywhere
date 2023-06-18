// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type {
  BundleGraphId,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonDataset,
  ComparisonGroupSummary,
  ComparisonScenario,
  ComparisonTestSummary,
  ComparisonView,
  ComparisonViewGroup,
  GraphComparisonReport,
  LoadedBundle
} from '@sdeverywhere/check-core'
import { diffGraphs } from '@sdeverywhere/check-core'

import { getAnnotationsForDataset, getAnnotationsForScenario } from '../_shared/annotations'
import { getBucketIndex } from '../_shared/buckets'
import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'

import type { ComparisonDetailItem } from './compare-detail-item'
import { groupItemsByTitle } from './compare-detail-item'

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

export interface CompareAllGraphsSections {
  /** The section view models. */
  sections: CompareGraphsSectionViewModel[]
  /** The total number of graphs with changes (non-zero difference). */
  nonZeroDiffCount: number
  /** The breakdown of graph differences per bucket. */
  diffPercentByBucket: number[]
}

export interface CompareDetailViewModel {
  kind: ComparisonGroupingKind
  /** The pretitle (e.g., view group title). */
  pretitle?: string
  /** The title (e.g., output variable name, scenario title, view title). */
  title: string
  /** The subtitle (e.g., output variable source name or scenario position). */
  subtitle?: string
  /** A string containing HTML `<span>` elements for annotations. */
  annotations?: string
  /** The index of the row before this one. */
  previousRowIndex?: number
  /** The index of the row after this one. */
  nextRowIndex?: number
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
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  groupSummary: ComparisonGroupSummary,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
): CompareDetailViewModel {
  switch (groupSummary.group.kind) {
    case 'by-dataset':
      return createCompareDetailViewModelForDataset(
        comparisonConfig,
        dataCoordinator,
        groupSummary,
        previousRowIndex,
        nextRowIndex
      )
    case 'by-scenario':
      return createCompareDetailViewModelForScenario(
        comparisonConfig,
        dataCoordinator,
        groupSummary,
        viewGroup,
        view,
        previousRowIndex,
        nextRowIndex
      )
    default:
      assertNever(groupSummary.group.kind)
  }
}

function createCompareDetailViewModelForDataset(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  groupSummary: ComparisonGroupSummary,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
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
    // TODO: For now show up to two items
    // TODO: If more than two items in the row, add more rows
    let item1: ComparisonDetailItem
    let item2: ComparisonDetailItem
    if (group.items[0] !== allAtDefaultItem) {
      item1 = group.items.length > 0 ? group.items[0] : undefined
      item2 = group.items.length > 1 ? group.items[1] : undefined
    }
    const detailRow = createCompareDetailRowViewModel(
      comparisonConfig,
      dataCoordinator,
      'scenarios',
      group.title,
      undefined, // TODO: Subtitle?
      [allAtDefaultItem, item1, item2]
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

  return {
    kind: 'by-dataset',
    title,
    subtitle,
    annotations,
    previousRowIndex,
    nextRowIndex,
    relatedListHeader: 'Appears in:',
    relatedItems,
    graphSections: [],
    detailRows
  }
}

function createCompareDetailViewModelForScenario(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  groupSummary: ComparisonGroupSummary,
  viewGroup: ComparisonViewGroup | undefined,
  view: ComparisonView | undefined,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
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
      'datasets',
      title,
      subtitle,
      [detailItem]
    )

    rows.push({
      viewModel: rowViewModel,
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
  const detailRows = sortedRows.map(row => row.viewModel)

  // Add the compared graphs at top, if defined for the given view
  let graphSections: CompareGraphsSectionViewModel[]
  if (view?.graphs) {
    const testSummaries = groupSummary.group.testSummaries
    graphSections = createCompareGraphsSectionViewModels(comparisonConfig, dataCoordinator, view, testSummaries)
  } else {
    graphSections = []
  }

  return {
    kind,
    pretitle,
    title,
    subtitle,
    annotations,
    previousRowIndex,
    nextRowIndex,
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
  if (view.graphs === 'all') {
    // For the special "all graphs" case, break the list of graphs into sections
    const allGraphs = getAllGraphsSections(comparisonConfig, dataCoordinator, view.scenario, testSummaries)
    return allGraphs.sections
  }

  // No sections when there are no graphs
  if (view.graphs.length === 0) {
    return []
  }

  // When a specific set of graphs is defined, use a single "Featured graphs" section
  const graphSpecsL = comparisonConfig.bundleL.model.modelSpec.graphSpecs
  const graphSpecsR = comparisonConfig.bundleR.model.modelSpec.graphSpecs
  const scenario = view.scenario
  const rows: CompareGraphsRowViewModel[] = []
  for (const graphId of view.graphs) {
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

export function getAllGraphsSections(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  scenario: ComparisonScenario,
  testSummaries: ComparisonTestSummary[]
): CompareAllGraphsSections {
  // Get the union of all graph IDs appearing in either left or right
  const graphIds: Set<BundleGraphId> = new Set()
  function addGraphIds(bundle: LoadedBundle): void {
    if (bundle.model.modelSpec.graphSpecs) {
      for (const graphSpec of bundle.model.modelSpec.graphSpecs) {
        graphIds.add(graphSpec.id)
      }
    }
  }
  addGraphIds(comparisonConfig.bundleL)
  addGraphIds(comparisonConfig.bundleR)

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
  const totalGraphCount = graphIds.size
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
