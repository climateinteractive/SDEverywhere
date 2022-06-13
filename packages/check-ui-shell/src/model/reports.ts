// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'
import type {
  DatasetKey,
  CompareDatasetSummary,
  CompareConfig,
  CompareSummary,
  ScenarioKey
} from '@sdeverywhere/check-core'
import { allInputsAtPositionScenario } from '@sdeverywhere/check-core'
import { getBucketIndex } from '../_shared/buckets'

export type Grouping = 'dataset' | 'scenario'

export interface CompareGroupReport {
  grouping: Grouping
  key: DatasetKey | ScenarioKey
  datasetSummaries: CompareDatasetSummary[]
  totalScore: number
  totalDiffCount: number
  diffCountByBucket: number[]
  diffPercentByBucket: number[]
}

export interface GroupedReports {
  byDataset: CompareGroupReport[]
  byScenario: CompareGroupReport[]
}

/**
 * Convert a set of `CompareDatasetSummary` objects to `CompareGroupReports` grouped
 * by dataset and by scenario.
 */
export function groupedReportsFromSummaries(
  compareConfig: CompareConfig,
  compareSummary: CompareSummary,
  simplifyScenarios: boolean
): GroupedReports {
  // Put the provided summaries in a map for faster lookup
  const existingSummaries: Map<string, CompareDatasetSummary> = new Map()
  for (const summary of compareSummary.datasetSummaries) {
    const key = `${summary.s}::${summary.d}`
    existingSummaries.set(key, summary)
  }

  // Get the configured set of scenarios
  const scenarios = simplifyScenarios
    ? [allInputsAtPositionScenario('at-default')]
    : compareConfig.scenarios.getScenarios()

  // Get the full set of scenario/dataset pairs
  const allDatasetSummaries: CompareDatasetSummary[] = []
  for (const scenario of scenarios) {
    const datasetKeys = compareConfig.datasets.getDatasetKeysForScenario(scenario)
    for (const datasetKey of datasetKeys) {
      // If we have a summary in the array that was passed in, it means
      // the `maxDiff` was non-zero, so include that value, otherwise
      // assume zero
      const key = `${scenario.key}::${datasetKey}`
      const existingSummary = existingSummaries.get(key)
      const maxDiff = existingSummary?.md || 0
      allDatasetSummaries.push({
        s: scenario.key,
        d: datasetKey,
        md: maxDiff
      })
    }
  }

  // Group summaries by dataset
  const byDataset = getGroupReports(compareConfig, 'dataset', allDatasetSummaries)

  // Group summaries by scenario
  const byScenario = getGroupReports(compareConfig, 'scenario', allDatasetSummaries)

  return {
    byDataset,
    byScenario
  }
}

/**
 * Group the given summaries, returning one `CompareGroupReport` for each group.
 */
function getGroupReports(
  compareConfig: CompareConfig,
  grouping: Grouping,
  datasetSummaries: CompareDatasetSummary[]
): CompareGroupReport[] {
  const thresholds = compareConfig.thresholds

  // Group scenarios by dataset or scenario
  const datasetSummariesByGroup: Map<string, CompareDatasetSummary[]> = new Map()
  for (const datasetSummary of datasetSummaries) {
    let key: string
    switch (grouping) {
      case 'dataset':
        key = datasetSummary.d
        break
      case 'scenario':
        key = datasetSummary.s
        break
      default:
        assertNever(grouping)
    }
    const summariesForGroup = datasetSummariesByGroup.get(key)
    if (summariesForGroup) {
      summariesForGroup.push(datasetSummary)
    } else {
      datasetSummariesByGroup.set(key, [datasetSummary])
    }
  }

  // Create an `CompareGroupReport` for each group
  const groupReports: CompareGroupReport[] = []
  for (const [groupKey, datasetSummaries] of datasetSummariesByGroup.entries()) {
    const groupReport = getGroupReport(thresholds, grouping, groupKey, datasetSummaries)
    groupReports.push(groupReport)
  }
  return groupReports
}

/**
 * Return a report showing the differences for a single dataset or scenario across
 * the given set of comparisons.
 */
function getGroupReport(
  thresholds: number[],
  grouping: Grouping,
  groupKey: DatasetKey | ScenarioKey,
  datasetSummaries: CompareDatasetSummary[]
): CompareGroupReport {
  // Add up scores and group them into buckets
  const diffCountByBucket = Array(thresholds.length + 2).fill(0)
  let totalScore = 0
  let totalDiffCount = 0
  for (const summary of datasetSummaries) {
    // Currently the cli only includes scenarios for which data is
    // defined in both left and right, and `maxDiff` is non-zero
    const bucketIndex = getBucketIndex(summary.md, thresholds)
    diffCountByBucket[bucketIndex]++
    totalScore += Math.pow(10, bucketIndex)
    totalDiffCount++
  }

  // Get the percentage of diffs for each bucket relative to the total number
  // of scenarios for this output variable
  let diffPercentByBucket: number[]
  if (totalDiffCount > 0) {
    diffPercentByBucket = diffCountByBucket.map(count => (count / totalDiffCount) * 100)
  } else {
    // TODO: How to handle case where data is defined on only one side?
    diffPercentByBucket = []
  }

  return {
    grouping,
    key: groupKey,
    datasetSummaries,
    totalScore,
    totalDiffCount,
    diffCountByBucket,
    diffPercentByBucket
  }
}
