// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { getBucketIndex } from './buckets'
import type { ComparisonGroupScores } from './comparison-group-types'
import type { ComparisonTestSummary } from './comparison-report-types'

/**
 * Compute the overall scores for the given group of comparison test summaries.
 *
 * @param testSummaries The comparison test summaries to consider.
 * @param thresholds The array of thresholds that determine the buckets into which
 * the scores will be summarized.
 */
export function getScoresForTestSummaries(
  testSummaries: ComparisonTestSummary[],
  thresholds: number[]
): ComparisonGroupScores {
  // Add up scores and group them into buckets (6 buckets: 0-4 for diff levels, 5 for skipped)
  const diffCountByBucket = Array(thresholds.length + 3).fill(0)
  const totalMaxDiffByBucket = Array(thresholds.length + 3).fill(0)
  let totalDiffCount = 0
  for (const testSummary of testSummaries) {
    const bucketIndex = getBucketIndex(testSummary.md, thresholds)
    diffCountByBucket[bucketIndex]++
    // Only include in the total if the value is defined (not skipped)
    if (testSummary.md !== undefined) {
      totalMaxDiffByBucket[bucketIndex] += testSummary.md
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
    totalMaxDiffByBucket,
    diffCountByBucket,
    diffPercentByBucket
  }
}
