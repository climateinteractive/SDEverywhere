// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { Outputs } from '../_shared'

import { ReferencedRunModelParams } from './referenced-run-model-params'
import { ModelListing } from '../model-runner'

const json = `
{
  "dimensions": [
  ],
  "variables": [
    {
      "refId": "_a",
      "varName": "_a",
      "varIndex": 1
    },
    {
      "refId": "_b",
      "varName": "_b",
      "varIndex": 2
    },
    {
      "refId": "_x",
      "varName": "_x",
      "varIndex": 3
    },
    {
      "refId": "_y",
      "varName": "_y",
      "varIndex": 4
    }
  ]
}
`

describe('ReferencedRunModelParams', () => {
  it('should return correct values from accessors', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const params = new ReferencedRunModelParams()
    params.updateFromParams(inputs, outputs)

    expect(params.getInputs()).toBeUndefined()

    expect(params.getOutputIndices()).toBeUndefined()

    expect(params.getOutputs()).toBeUndefined()
    expect(params.getOutputsObject()).toBeDefined()
    expect(params.getOutputsObject().varIds).toEqual(['_x', '_y'])
    expect(params.getOutputsLength()).toBe(6)
  })

  it('should copy inputs', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const params = new ReferencedRunModelParams()
    params.updateFromParams(inputs, outputs)

    let array: Float64Array
    const create = (numElements: number) => {
      array = new Float64Array(numElements)
      return array
    }

    // Verify case where existing array is undefined
    params.copyInputs(undefined, create)
    expect(array).toEqual(new Float64Array([1, 2, 3]))

    // Verify case where existing array is too small
    array = new Float64Array(2)
    params.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3]))

    // Verify case where existing array is large enough
    array = new Float64Array([6, 6, 6, 6])
    params.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3, 6]))
  })

  it('should copy output indices', () => {
    const listing = new ModelListing(json)
    const inputs = [1, 2, 3]
    const normalOutputs = new Outputs(['_x', '_y'], 2000, 2002, 1)
    const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_a', '_b'])

    const params = new ReferencedRunModelParams()
    params.updateFromParams(inputs, implOutputs)

    const expectedIndices = new Int32Array([
      // _x
      3, 0, 0, 0,
      // _a
      1, 0, 0, 0,
      // _b
      2, 0, 0, 0,
      // (zero terminator)
      0, 0, 0, 0
    ])

    let array: Int32Array
    const create = (numElements: number) => {
      array = new Int32Array(numElements)
      return array
    }

    // Verify case where existing array is undefined
    params.copyOutputIndices(undefined, create)
    expect(array).toEqual(expectedIndices)

    // Verify case where existing array is too small
    array = new Int32Array(2)
    params.copyOutputIndices(array, create)
    expect(array).toEqual(expectedIndices)

    // Verify case where existing array is large enough
    array = new Int32Array(20).fill(6)
    params.copyOutputIndices(array, create)
    expect(array).toEqual(
      new Int32Array([
        // _x
        3, 0, 0, 0,
        // _a
        1, 0, 0, 0,
        // _b
        2, 0, 0, 0,
        // (zero terminators)
        0, 0, 0, 0, 0, 0, 0, 0
      ])
    )
  })

  it('should store output values from the model run', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const params = new ReferencedRunModelParams()
    params.updateFromParams(inputs, outputs)

    // Pretend that the model writes the following values to its buffer then
    // calls the `store` methods
    const outputsArray = new Float64Array([1, 2, 3, 4, 5, 6])
    params.storeElapsedTime(42)
    params.storeOutputs(outputsArray)

    // Verify that the elapsed time can be accessed
    expect(params.getElapsedTime()).toBe(42)

    // Verify that the `Outputs` instance is updated with the correct values
    expect(outputs.varIds).toEqual(['_x', '_y'])
    const p = (x: number, y: number) => {
      return {
        x,
        y
      }
    }
    expect(outputs.getSeriesForVar('_x').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outputs.getSeriesForVar('_y').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
  })
})
