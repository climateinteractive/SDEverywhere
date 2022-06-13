// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Dataset } from '../_shared/types'
import { diffDatasets } from './compare-datasets'

describe('diffDatasets', () => {
  it('should return a report for two datasets', () => {
    const valuesL: Dataset = new Map([
      [0, 10],
      [1, 20],
      [2, 40],
      [3, 49]
    ])
    const valuesR: Dataset = new Map([
      [0, 12],
      [1, 20],
      [2, 45],
      [3, 50]
    ])

    const report = diffDatasets(valuesL, valuesR)
    expect(report.validity).toBe('both')
    expect(report.minValue).toBe(10)
    expect(report.maxValue).toBe(50)
    expect(report.minDiff).toBe(0)
    expect(report.maxDiff).toBe(12.5)
    expect(report.maxDiffPoint).toEqual({ time: 2, valueL: 40, valueR: 45 })
    expect(report.avgDiff).toBe(5)
  })

  it('should ignore times that do not exist in both datasets', () => {
    const valuesL: Dataset = new Map([
      [0, 10],
      [2, 50],
      [3, 30]
    ])
    const valuesR: Dataset = new Map([
      [0, 10],
      [1, 0],
      [3, 40]
    ])

    const report = diffDatasets(valuesL, valuesR)
    expect(report.validity).toBe('both')
    expect(report.minValue).toBe(0)
    expect(report.maxValue).toBe(50)
    expect(report.minDiff).toBe(0)
    expect(report.maxDiff).toBe(20)
    expect(report.maxDiffPoint).toEqual({ time: 3, valueL: 30, valueR: 40 })
  })

  it('should calculate relative change when both datasets have a constant value', () => {
    const valuesL: Dataset = new Map([
      [0, 10],
      [3, 10]
    ])
    const valuesR: Dataset = new Map([[0, 4]])

    const report = diffDatasets(valuesL, valuesR)
    expect(report.validity).toBe('both')
    expect(report.minValue).toBe(4)
    expect(report.maxValue).toBe(10)
    expect(report.minDiff).toBe(60)
    expect(report.maxDiff).toBe(60)
    expect(report.maxDiffPoint).toEqual({ time: 0, valueL: 10, valueR: 4 })
  })

  it('should include correct validity when one or both sides is missing', () => {
    const values: Dataset = new Map([[0, 4]])
    expect(diffDatasets(values, values).validity).toBe('both')
    expect(diffDatasets(values, undefined).validity).toBe('left-only')
    expect(diffDatasets(undefined, values).validity).toBe('right-only')
    expect(diffDatasets(undefined, undefined).validity).toBe('neither')
  })
})
