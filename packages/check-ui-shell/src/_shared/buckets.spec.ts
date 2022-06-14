// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { getBucketIndex } from './buckets'

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
})
