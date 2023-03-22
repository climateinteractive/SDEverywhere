// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type {
  BundleGraphId,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  ComparisonTestSummary,
  GraphComparisonReport,
  LoadedBundle
} from '@sdeverywhere/check-core'
import { diffGraphs } from '@sdeverywhere/check-core'

import { getBucketIndex } from '../../../_shared/buckets'

import type { CompareGraphsRowViewModel } from './compare-graphs-row-vm'
import { createCompareGraphsRowViewModel } from './compare-graphs-row-vm'

export interface CompareGraphsSectionViewModel {
  /** The section title. */
  title: string
  /** The row view models. */
  rows: CompareGraphsRowViewModel[]
}

export interface CompareGraphsViewModel {
  /** Whether any graphs have differences in metadata and/or datasets. */
  hasDiffs: boolean
  /** The percents of graphs that have differences in metadata and/or datasets. */
  diffPercentByBucket: number[]
  /** The section view models. */
  sections: CompareGraphsSectionViewModel[]
}

export function createCompareGraphsViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  scenario: ComparisonScenario,
  testSummaries: ComparisonTestSummary[]
): CompareGraphsViewModel {
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
  const diffCountByBucket = Array(comparisonConfig.thresholds.length + 2).fill(0)
  for (const graphId of graphIds) {
    const graphL = comparisonConfig.bundleL.model.modelSpec.graphSpecs?.find(s => s.id === graphId)
    const graphR = comparisonConfig.bundleR.model.modelSpec.graphSpecs?.find(s => s.id === graphId)
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
  const totalDiffCount = graphIds.size
  const diffPercentByBucket = diffCountByBucket.map(count => (count / totalDiffCount) * 100)
  const hasDiffs = diffCountByBucket[0] !== totalDiffCount

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
  addSection(added, 'Added', false)
  addSection(removed, 'Removed', false)
  addSection(metadataAndDatasets, 'Metadata and dataset changes', true)
  addSection(metadataOnly, 'Metadata changes only', false)
  addSection(datasetsOnly, 'Dataset changes only', true)
  addSection(unchanged, 'Unchanged', false)

  return {
    hasDiffs,
    diffPercentByBucket,
    sections
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
