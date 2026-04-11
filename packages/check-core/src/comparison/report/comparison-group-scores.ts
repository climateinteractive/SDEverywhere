// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { getBucketIndex } from './buckets'
import type { ComparisonGroupScores } from './comparison-group-types'
import type { ComparisonTestSummary } from './comparison-report-types'
import type { ComparisonSortMode } from './comparison-sort-mode'

/**
 * Compute the overall scores for the given group of comparison test summaries.
 *
 * @param testSummaries The comparison test summaries to consider.
 * @param thresholds The array of thresholds that determine the buckets into which
 * the scores will be summarized.
 * @param sortMode The sort mode to determine which field to use for scoring.
 */
export function getScoresForTestSummaries(
  testSummaries: ComparisonTestSummary[],
  thresholds: number[],
  sortMode: ComparisonSortMode
): ComparisonGroupScores {
  // Add up scores and group them into buckets (6 buckets: 0-4 for diff levels, 5 for skipped)
  const diffCountByBucket = Array(thresholds.length + 3).fill(0)
  const totalDiffByBucket = Array(thresholds.length + 3).fill(0)
  let totalDiffCount = 0

  // Determine which field to use based on sort mode
  let valueKey: 'md' | 'ad' | 'mdb' | 'adb'
  switch (sortMode) {
    case 'max-diff':
      valueKey = 'md'
      break
    case 'avg-diff':
      valueKey = 'ad'
      break
    case 'max-diff-relative':
      valueKey = 'mdb'
      break
    case 'avg-diff-relative':
      valueKey = 'adb'
      break
  }

  for (const testSummary of testSummaries) {
    const value = testSummary[valueKey]
    const bucketIndex = getBucketIndex(value, thresholds)
    diffCountByBucket[bucketIndex]++
    // Only include in the total if the value is defined (not skipped)
    if (value !== undefined) {
      totalDiffByBucket[bucketIndex] += value
    }
    totalDiffCount++
  }

  // Get the percentage of diffs for each bucket relative to the total number
  // of comparisons in the given set
  let diffPercentByBucket: number[]
  if (totalDiffCount > 0) {
    diffPercentByBucket = diffCountByBucket.map(count => (count / totalDiffCount) * 100)
  } else {
    diffPercentByBucket = []
  }

  return {
    totalDiffCount,
    totalDiffByBucket,
    diffCountByBucket,
    diffPercentByBucket
  }
}
