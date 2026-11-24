// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { getBucketIndex, hasSignificantDiffs } from './buckets'

describe('getBucketIndex', () => {
  it('should return the correct bucket index for a value and an array of thresholds', () => {
    const thresholds = [2, 4, 6]
    expect(getBucketIndex(0.0, thresholds)).toBe(0)
    expect(getBucketIndex(0.5, thresholds)).toBe(1)
    expect(getBucketIndex(2.0, thresholds)).toBe(2)
    expect(getBucketIndex(3.0, thresholds)).toBe(2)
    expect(getBucketIndex(3.5, thresholds)).toBe(2)
    expect(getBucketIndex(4.0, thresholds)).toBe(3)
    expect(getBucketIndex(5.0, thresholds)).toBe(3)
    expect(getBucketIndex(6.0, thresholds)).toBe(4)
    expect(getBucketIndex(7.0, thresholds)).toBe(4)
  })

  it('should return the special bucket 5 for undefined values (skipped scenarios)', () => {
    const thresholds = [2, 4, 6]
    expect(getBucketIndex(undefined, thresholds)).toBe(5)
  })
})

describe('hasSignificantDiffs', () => {
  it('should return true when there are no scores (because the row has issues)', () => {
    expect(hasSignificantDiffs(undefined)).toBe(true)
  })

  it('should return true when any bucket other than the first and last is non-zero', () => {
    expect(hasSignificantDiffs([90, 10, 0, 0, 0, 0])).toBe(true)
    expect(hasSignificantDiffs([90, 0, 0, 0, 10, 0])).toBe(true)
  })

  it('should return false when only the "no differences" and "skipped" buckets are non-zero', () => {
    expect(hasSignificantDiffs([100, 0, 0, 0, 0, 0])).toBe(false)
    expect(hasSignificantDiffs([50, 0, 0, 0, 0, 50])).toBe(false)
    expect(hasSignificantDiffs([])).toBe(false)
  })
})
