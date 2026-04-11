// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export function getBucketIndex(diff: number | undefined, thresholds: number[]): number {
  // When the diff is undefined (indicating a skipped comparison), put it in the last bucket
  if (diff === undefined) {
    return thresholds.length + 2
  }

  // When there are no differences, put it in the first (green) bucket
  if (diff === 0) {
    return 0
  }

  // Otherwise, test the given diff value against each threshold (using
  // strict "less than" comparison)
  for (let i = 0; i < thresholds.length; i++) {
    if (diff < thresholds[i]) {
      return i + 1
    }
  }

  // When the difference is greater than or equal to the last threshold,
  // put it in the next-to-last bucket (the ">= max threshold" bucket)
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
    // If there are any non-zero buckets (other than the first "no differences" bucket or
    // the last "skipped" bucket), treat it as a view with diffs
    return diffPercentByBucket.some(
      (diffsInBucket, index) => index > 0 && index < diffPercentByBucket.length - 1 && diffsInBucket > 0
    )
  }
}
