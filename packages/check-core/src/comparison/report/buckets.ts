// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export function getBucketIndex(diffPct: number | undefined, thresholds: number[]): number {
  // When the diff is undefined (indicating a skipped comparison), put it in the last bucket
  if (diffPct === undefined) {
    return thresholds.length + 2
  }

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
