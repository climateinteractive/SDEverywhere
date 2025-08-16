// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { JsModelLookup } from './js-model-lookup'

describe('JsModelLookup', () => {
  it('should return expected data', () => {
    // Create a lookup with initial data
    const lookup = new JsModelLookup(3, [0, 0, 1, 1, 2, 2])

    // Verify that original data is returned
    expect(lookup.getValueForX(-1.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.5, 'interpolate')).toBe(0.5)
    expect(lookup.getValueForX(1.0, 'interpolate')).toBe(1.0)
    expect(lookup.getValueForX(1.5, 'interpolate')).toBe(1.5)
    expect(lookup.getValueForX(2.0, 'interpolate')).toBe(2.0)
    expect(lookup.getValueForX(3.0, 'interpolate')).toBe(2.0)

    // Call `setData` with larger array
    lookup.setData(2, new Float64Array([0, 0, 1, 1]))

    // Verify that overridden data is returned
    expect(lookup.getValueForX(-1.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.5, 'interpolate')).toBe(0.5)
    expect(lookup.getValueForX(1.0, 'interpolate')).toBe(1.0)
    expect(lookup.getValueForX(1.5, 'interpolate')).toBe(1.0)

    // Call `setData` with larger array
    lookup.setData(5, new Float64Array([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]))

    // Verify that overridden data is returned
    expect(lookup.getValueForX(-1.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.5, 'interpolate')).toBe(0.5)
    expect(lookup.getValueForX(1.0, 'interpolate')).toBe(1.0)
    expect(lookup.getValueForX(1.5, 'interpolate')).toBe(1.5)
    expect(lookup.getValueForX(2.0, 'interpolate')).toBe(2.0)
    expect(lookup.getValueForX(3.0, 'interpolate')).toBe(3.0)
    expect(lookup.getValueForX(4.0, 'interpolate')).toBe(4.0)
    expect(lookup.getValueForX(5.0, 'interpolate')).toBe(4.0)

    // Call `setData` with undefined to reset to original data
    lookup.setData(0, undefined)

    // Verify that original data is returned
    expect(lookup.getValueForX(-1.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.0, 'interpolate')).toBe(0.0)
    expect(lookup.getValueForX(0.5, 'interpolate')).toBe(0.5)
    expect(lookup.getValueForX(1.0, 'interpolate')).toBe(1.0)
    expect(lookup.getValueForX(1.5, 'interpolate')).toBe(1.5)
    expect(lookup.getValueForX(2.0, 'interpolate')).toBe(2.0)
    expect(lookup.getValueForX(3.0, 'interpolate')).toBe(2.0)
  })
})
