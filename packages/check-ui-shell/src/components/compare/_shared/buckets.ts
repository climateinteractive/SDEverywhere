// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export function getBucketIndex(diffPct: number, thresholds: number[]): number {
  // When there are no differences, put it in the first (green) bucket
  if (diffPct === 0) {
    return 0
  }

  // Otherwise, test the given diff value against each threshold (using
  // strict "less than" comparison)
  for (let i = 0; i < thresholds.length; i++) {
    if (diffPct < thresholds[i]) {
      return i + 1
    }
  }

  // When the difference is greater than or equal to the last threshold,
  // put it in the final bucket
  return thresholds.length + 1
}

/**
 * Return true if the row has significant differences, i.e., a normal row with at least one test
 * reporting differences, or an "error" row (a row where tests couldn't be run).
 */
export function hasSignificantDiffs(diffPercentByBucket: number[] | undefined): boolean {
  if (diffPercentByBucket === undefined) {
    // If there are no scores, it means there are issues, so treat it as a view with diffs
    return true
  } else {
    // If there are any non-zero buckets (other than the first "no differences" bucket), treat
    // it as a view with diffs
    return diffPercentByBucket.some((diffsInBucket, index) => index > 0 && diffsInBucket > 0)
  }
}
