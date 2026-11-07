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
