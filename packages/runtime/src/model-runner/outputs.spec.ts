// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Point } from './outputs'
import { Outputs } from './outputs'

function p(x: number, y: number): Point {
  return { x, y }
}

describe('Outputs', () => {
  it('should be initialized with the correct data', () => {
    const outputVars = ['_temp_change', '_co2_conc']
    const outputs = new Outputs(outputVars, 1990, 2100)

    expect(outputs.timeStart).toBe(1990)
    expect(outputs.timeEnd).toBe(2100)
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

  describe('updateFromBuffer', () => {
    it('should parse a valid model outputs buffer', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2005)

      const outputValues = [0.2, 0.4, 1.0, 2.0, 2.2, 2.5, 400, 450, 500, 510, 520, 530]
      const rowLength = 6

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.timeStart).toBe(2000)
      expect(actual.timeEnd).toBe(2005)
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
      const outputs = new Outputs(outputVars, 2000, 2003)

      const outputValues = [Number.NaN, -Number.MAX_VALUE, -2e32, 2.5]
      const rowLength = 4

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.timeStart).toBe(2000)
      expect(actual.timeEnd).toBe(2003)
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
      const outputs = new Outputs(outputVars, 2000, 2002)

      const outputValues = [0.2, 0.4, 1.0, 1.5, 400, 450, 500, 600]
      const rowLength = 4

      const result = outputs.updateFromBuffer(new Float64Array(outputValues), rowLength)
      if (result.isErr()) {
        throw new Error(`updateFromBuffer failed: ${result.error}`)
      }

      const actual = outputs

      expect(actual.timeStart).toBe(2000)
      expect(actual.timeEnd).toBe(2002)
      expect(actual.varIds).toEqual(outputVars)

      expect(actual.varSeries.length).toBe(2)
      expect(actual.varSeries[0].varId).toBe('_temp_change')
      expect(actual.varSeries[0].points).toEqual([p(2000, 0.2), p(2001, 0.4), p(2002, 1.0)])
      expect(actual.varSeries[1].varId).toBe('_co2_conc')
      expect(actual.varSeries[1].points).toEqual([p(2000, 400), p(2001, 450), p(2002, 500)])
    })

    it('should return error if buffer contains too few data points', () => {
      const outputVars = ['_temp_change', '_co2_conc']
      const outputs = new Outputs(outputVars, 2000, 2002)

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
