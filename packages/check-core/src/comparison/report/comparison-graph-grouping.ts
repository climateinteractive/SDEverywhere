// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ComparisonScenarioKey } from '../_shared/comparison-resolved-types'
import type { ComparisonConfig } from '../config/comparison-config'
import type { ComparisonGraphId } from '../config/comparison-spec-types'
import type { GraphComparisonReport } from '../diff-graphs/diff-graphs'
import { diffGraphs } from '../diff-graphs/diff-graphs'

import { getBucketIndex } from './buckets'
import type { ComparisonTestSummary } from './comparison-report-types'

/** The kind of change that the graphs in a group have in common. */
export type ComparisonGraphDiffGroupKind =
  | 'added'
  | 'removed'
  | 'metadata-and-datasets'
  | 'metadata-only'
  | 'datasets-only'
  | 'unchanged'

/** A graph in a group of graphs, with its comparison report. */
export interface ComparisonGraphDiffGroupItem {
  /** The ID of the graph. */
  graphId: ComparisonGraphId
  /** The comparison report for the graph. */
  graphReport: GraphComparisonReport
  /** The largest difference among the datasets of the graph. */
  maxDiffPct: number
}

/** A group of graphs that have the same kind of change. */
export interface ComparisonGraphDiffGroup {
  /** The kind of change that the graphs in this group have in common. */
  kind: ComparisonGraphDiffGroupKind
  /** The title of the group (for example, "Added graphs"). */
  title: string
  /** The graphs in this group. */
  items: ComparisonGraphDiffGroupItem[]
}

/** The result of grouping graphs by their differences. */
export interface ComparisonGraphsGroupedByDiffs {
  /** The non-empty groups, in display order. */
  groups: ComparisonGraphDiffGroup[]
  /** The total number of graphs with changes (non-zero difference). */
  nonZeroDiffCount: number
  /** The breakdown of graph differences per bucket. */
  diffPercentByBucket: number[]
}

/**
 * Compare the given graphs and group them by the kind of change (added, removed, metadata
 * and/or dataset changes, or unchanged), with the graphs that have the largest dataset changes
 * first.  This is used by the "Comparison views" tab of the model-check report for the views
 * that show graphs grouped by diffs.
 *
 * @param comparisonConfig The comparison configuration.
 * @param scenarioKey The key of the scenario used for comparing datasets.
 * @param testSummaries The set of test summaries from a previous comparison run.
 * @param graphIds The IDs of the graphs to compare.
 * @returns The graphs grouped by their differences.
 */
export function groupGraphsByDiffs(
  comparisonConfig: ComparisonConfig,
  scenarioKey: ComparisonScenarioKey,
  testSummaries: ComparisonTestSummary[],
  graphIds: ComparisonGraphId[]
): ComparisonGraphsGroupedByDiffs {
  // Prepare the groups
  const added: ComparisonGraphDiffGroupItem[] = []
  const removed: ComparisonGraphDiffGroupItem[] = []
  const metadataAndDatasets: ComparisonGraphDiffGroupItem[] = []
  const metadataOnly: ComparisonGraphDiffGroupItem[] = []
  const datasetsOnly: ComparisonGraphDiffGroupItem[] = []
  const unchanged: ComparisonGraphDiffGroupItem[] = []

  // Compare the graphs
  const graphSpecsL = comparisonConfig.bundleL.modelSpec.graphSpecs
  const graphSpecsR = comparisonConfig.bundleR.modelSpec.graphSpecs
  const diffCountByBucket = Array(comparisonConfig.thresholds.length + 3).fill(0)
  for (const graphId of graphIds) {
    const graphL = graphSpecsL?.find(s => s.id === graphId)
    const graphR = graphSpecsR?.find(s => s.id === graphId)
    const graphReport = diffGraphs(graphL, graphR, scenarioKey, testSummaries)
    const maxDiffPct = maxDiffPctForGraph(graphReport)
    const item: ComparisonGraphDiffGroupItem = { graphId, graphReport, maxDiffPct }

    // Determine which group the graph will be added to
    let bucketIndex: number
    switch (graphReport.inclusion) {
      case 'right-only':
        // Use "yellow" bucket for added graphs
        bucketIndex = 1
        added.push(item)
        break
      case 'left-only':
        // Use "yellow" bucket for removed graphs
        bucketIndex = 1
        removed.push(item)
        break
      case 'both':
        if (maxDiffPct > 0) {
          // Use the appropriate bucket for graphs with dataset changes
          bucketIndex = getBucketIndex(maxDiffPct, comparisonConfig.thresholds)
          if (graphReport.metadataReports.length > 0) {
            metadataAndDatasets.push(item)
          } else {
            datasetsOnly.push(item)
          }
        } else {
          if (graphReport.metadataReports.length > 0) {
            // Use "yellow" bucket for graphs with metadata changes only
            bucketIndex = 1
            metadataOnly.push(item)
          } else {
            // Use "green" bucket for graphs with no changes
            bucketIndex = 0
            unchanged.push(item)
          }
        }
        break
      case 'neither':
        // This shouldn't happen in practice
        bucketIndex = 0
        unchanged.push(item)
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

  // Add a group for each non-empty set of graphs
  const groups: ComparisonGraphDiffGroup[] = []
  function addGroup(
    items: ComparisonGraphDiffGroupItem[],
    kind: ComparisonGraphDiffGroupKind,
    title: string,
    sort: boolean
  ) {
    if (items.length > 0) {
      const sortedItems = sort ? items.sort((a, b) => (a.maxDiffPct > b.maxDiffPct ? -1 : 1)) : items
      groups.push({
        kind,
        title,
        items: sortedItems
      })
    }
  }
  addGroup(added, 'added', 'Added graphs', false)
  addGroup(removed, 'removed', 'Removed graphs', false)
  addGroup(metadataAndDatasets, 'metadata-and-datasets', 'Graphs with metadata and dataset changes', true)
  addGroup(metadataOnly, 'metadata-only', 'Graphs with metadata changes only', false)
  addGroup(datasetsOnly, 'datasets-only', 'Graphs with dataset changes only', true)
  addGroup(unchanged, 'unchanged', 'Unchanged graphs', false)

  return {
    groups,
    nonZeroDiffCount,
    diffPercentByBucket
  }
}

/**
 * Return the largest difference among the datasets of the given graph.
 *
 * @param graphReport The comparison report for the graph.
 */
function maxDiffPctForGraph(graphReport: GraphComparisonReport): number {
  let maxDiffPct = 0
  for (const datasetReport of graphReport.datasetReports) {
    if (datasetReport.maxDiff !== undefined && datasetReport.maxDiff > maxDiffPct) {
      maxDiffPct = datasetReport.maxDiff
    }
  }
  return maxDiffPct
}
