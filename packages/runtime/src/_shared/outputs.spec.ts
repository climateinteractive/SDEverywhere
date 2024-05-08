// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Point } from './outputs'
import { Outputs, Series } from './outputs'

function p(x: number, y: number): Point {
  return { x, y }
}

describe('Series', () => {
  describe('getValueAtTime', () => {
    it('should work with a save frequency of 1.0', () => {
      const s = new Series('_x', [p(0, 1), p(1, 2), p(2, 4), p(3, 8), p(4, 16)])
      expect(s.getValueAtTime(0)).toBe(1)
      expect(s.getValueAtTime(1)).toBe(2)
      expect(s.getValueAtTime(2)).toBe(4)
      expect(s.getValueAtTime(3)).toBe(8)
      expect(s.getValueAtTime(4)).toBe(16)
      expect(s.getValueAtTime(-1)).toBeUndefined()
      expect(s.getValueAtTime(2.5)).toBeUndefined()
      expect(s.getValueAtTime(5)).toBeUndefined()
    })

    it('should work with a save frequency of 0.5', () => {
      const s = new Series('_x', [p(0, 1), p(0.5, 2), p(1, 4), p(1.5, 8), p(2, 16)])
      expect(s.getValueAtTime(0)).toBe(1)
      expect(s.getValueAtTime(0.5)).toBe(2)
      expect(s.getValueAtTime(1)).toBe(4)
      expect(s.getValueAtTime(1.5)).toBe(8)
      expect(s.getValueAtTime(2)).toBe(16)
      expect(s.getValueAtTime(-1)).toBeUndefined()
      expect(s.getValueAtTime(0.25)).toBeUndefined()
      expect(s.getValueAtTime(5)).toBeUndefined()
    })

    it('should work with a save frequency of 2.0', () => {
      const s = new Series('_x', [p(0, 1), p(2, 2), p(4, 4), p(6, 8), p(8, 16)])
      expect(s.getValueAtTime(0)).toBe(1)
      expect(s.getValueAtTime(2)).toBe(2)
      expect(s.getValueAtTime(4)).toBe(4)
      expect(s.getValueAtTime(6)).toBe(8)
      expect(s.getValueAtTime(8)).toBe(16)
      expect(s.getValueAtTime(-1)).toBeUndefined()
      expect(s.getValueAtTime(1)).toBeUndefined()
      expect(s.getValueAtTime(5)).toBeUndefined()
    })
  })
})

describe('Outputs', () => {
  it('should be initialized with the correct data (with save frequency of 1)', () => {
    const outputVars = ['_temp_change', '_co2_conc']
    const outputs = new Outputs(outputVars, 1990, 2100, 1)

    expect(outputs.startTime).toBe(1990)
    expect(outputs.endTime).toBe(2100)
    expect(outputs.saveFreq).toBe(1)
    expect(outputs.varIds).toEqual(outputVars)

    expect(outputs.varSeries.length).toBe(2)
    expect(outputs.varSeries[0].varId).toBe('_temp_change')
    expect(outputs.varSeries[0].points.length).toBe(111)
    expect(outputs.varSeries[1].varId).toBe('_co2_conc')
    expect(outputs.varSeries[1].points.length).toBe(111)

    let i = 0
    for (let year = 1990; year <= 2100; year++) {
      const expectedPoint: Point = { x: year, y: 0 }
      expect(outputs.varSeries[0].points[i]).toEqual(expectedPoint)
      expect(outputs.varSeries[1].points[i]).toEqual(expectedPoint)
      i++
    }
  })

  it('should be initialized with the correct data (with save frequency of 0.25)', () => {
    const outputVars = ['_temp_change', '_co2_conc']
    const outputs = new Outputs(outputVars, 1990, 2000, 0.25)

    expect(outputs.startTime).toBe(1990)
    expect(outputs.endTime).toBe(2000)
    expect(outputs.saveFreq).toBe(0.25)
    expect(outputs.varIds).toEqual(outputVars)

    expect(outputs.varSeries.length).toBe(2)
    expect(outputs.varSeries[0].varId).toBe('_temp_change')
    expect(outputs.varSeries[0].points.length).toBe(41)
    expect(outputs.varSeries[1].varId).toBe('_co2_conc')
    expect(outputs.varSeries[1].points.length).toBe(41)

    let i = 0
    for (let time = 1990; time <= 2000; time += 0.25) {
      const expectedPoint: Point = { x: time, y: 0 }
      expect(outputs.varSeries[0].points[i]).toEqual(expectedPoint)
      expect(outputs.varSeries[1].points[i]).toEqual(expectedPoint)
      i++
    }
  })

  describe('updateFromBuffer', () => {
    it('should parse a valid model outputs buffer', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2005, 1)

      const outputValues = [0.2, 0.4, 1.0, 2.0, 2.2, 2.5, 400, 450, 500, 510, 520, 530]
      const rowLength = 6

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.startTime).toBe(2000)
      expect(actual.endTime).toBe(2005)
      expect(actual.saveFreq).toBe(1)
      expect(actual.varIds).toEqual(outputVars)

      expect(actual.varSeries.length).toBe(2)
      expect(actual.varSeries[0].varId).toBe('_temp_change')
      expect(actual.varSeries[0].points).toEqual([
        p(2000, 0.2),
        p(2001, 0.4),
        p(2002, 1.0),
        p(2003, 2.0),
        p(2004, 2.2),
        p(2005, 2.5)
      ])
      expect(actual.varSeries[1].varId).toBe('_co2_conc')
      expect(actual.varSeries[1].points).toEqual([
        p(2000, 400),
        p(2001, 450),
        p(2002, 500),
        p(2003, 510),
        p(2004, 520),
        p(2005, 530)
      ])
    })

    it('should store invalid values as undefined', () => {
      const outputVars = ['_temp_change']
      const outputs = new Outputs(outputVars, 2000, 2003, 1)

      const outputValues = [Number.NaN, -Number.MAX_VALUE, -2e32, 2.5]
      const rowLength = 4

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.startTime).toBe(2000)
      expect(actual.endTime).toBe(2003)
      expect(actual.saveFreq).toBe(1)
      expect(actual.varIds).toEqual(outputVars)

      expect(actual.varSeries.length).toBe(1)
      expect(actual.varSeries[0].varId).toBe('_temp_change')
      expect(actual.varSeries[0].points).toEqual([
        p(2000, undefined),
        p(2001, undefined),
        p(2002, undefined),
        p(2003, 2.5)
      ])
    })

    it('should parse buffer with ok result if it contains more data points than the Outputs instance', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2002, 1)

      const outputValues = [0.2, 0.4, 1.0, 1.5, 400, 450, 500, 600]
      const rowLength = 4

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.startTime).toBe(2000)
      expect(actual.endTime).toBe(2002)
      expect(actual.saveFreq).toBe(1)
      expect(actual.varIds).toEqual(outputVars)

      expect(actual.varSeries.length).toBe(2)
      expect(actual.varSeries[0].varId).toBe('_temp_change')
      expect(actual.varSeries[0].points).toEqual([p(2000, 0.2), p(2001, 0.4), p(2002, 1.0)])
      expect(actual.varSeries[1].varId).toBe('_co2_conc')
      expect(actual.varSeries[1].points).toEqual([p(2000, 400), p(2001, 450), p(2002, 500)])
    })

    it('should return error if buffer contains too few data points (with save frequency of 1)', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2002, 1)

      const outputValues = [0.2, 0.4, 400, 450]
      const rowLength = 2

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isOk()) {
        throw new Error('updateFromBuffer did not return error as expected')
      }

      expect(result.error).toBe('invalid-point-count')
    })

    it('should return error if buffer contains too few data points (with save frequency of 0.25)', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2001, 0.25)

      const outputValues = [0.2, 0.4, 400, 450]
      const rowLength = 2

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isOk()) {
        throw new Error('updateFromBuffer did not return error as expected')
      }

      expect(result.error).toBe('invalid-point-count')
    })
  })
})
