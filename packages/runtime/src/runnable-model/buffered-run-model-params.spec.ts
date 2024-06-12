// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { Outputs, createLookupDef, type LookupDef } from '../_shared'

import { BufferedRunModelParams } from './buffered-run-model-params'
import { ModelListing } from '../model-listing'

const listingJson = `
{
  "dimensions": [
  ],
  "variables": [
    {
      "id": "_a",
      "index": 1
    },
    {
      "id": "_b",
      "index": 2
    },
    {
      "id": "_x",
      "index": 3
    },
    {
      "id": "_y",
      "index": 4
    }
  ]
}
`

const p = (x: number, y: number) => {
  return {
    x,
    y
  }
}

describe('BufferedRunModelParams', () => {
  it('should update buffer (simple case with inputs and outputs only)', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    // Update the first instance from params
    const params1 = new BufferedRunModelParams()
    params1.updateFromParams(inputs, outputs)
    expect(params1.getInputs()).toEqual(new Float64Array([1, 2, 3]))
    expect(params1.getOutputsLength()).toEqual(6)
    expect(params1.getOutputs()).toEqual(new Float64Array([0, 0, 0, 0, 0, 0]))
    expect(params1.getOutputsObject()).toBeUndefined()
    expect(params1.getOutputIndices()).toBeUndefined()

    // Store some output values
    params1.getOutputs().set([1, 2, 3, 4, 5, 6])

    // Update the second instance from the encoded buffer and verify that the
    // arrays are identical
    const params2 = new BufferedRunModelParams()
    const restoreAndVerify = () => {
      params2.updateFromEncodedBuffer(params1.getEncodedBuffer())
      expect(params2.getInputs()).toEqual(params1.getInputs())
      expect(params2.getOutputsLength()).toEqual(params1.getOutputsLength())
      expect(params2.getOutputs()).toEqual(params1.getOutputs())
      expect(params2.getOutputsObject()).toEqual(params1.getOutputsObject())
      expect(params2.getOutputIndices()).toEqual(params1.getOutputIndices())
    }
    restoreAndVerify()
  })

  it('should update buffer (when output var specs are included)', () => {
    const listing = new ModelListing(JSON.parse(listingJson))

    const inputs = [1, 2, 3]
    const normalOutputs = new Outputs(['_x', '_y'], 2000, 2002, 1)
    const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_a', '_b'])

    // Update using the normal outputs (which includes only 2 variables)
    const params1 = new BufferedRunModelParams()
    params1.updateFromParams(inputs, normalOutputs)
    expect(params1.getInputs()).toEqual(new Float64Array([1, 2, 3]))
    expect(params1.getOutputsLength()).toEqual(6)
    expect(params1.getOutputs()).toEqual(new Float64Array([0, 0, 0, 0, 0, 0]))
    expect(params1.getOutputsObject()).toBeUndefined()
    expect(params1.getOutputIndices()).toBeUndefined()

    // Create a second instance that can be used to verify roundtrip case (restoring
    // from an encoded buffer)
    const params2 = new BufferedRunModelParams()
    const restoreAndVerify = () => {
      params2.updateFromEncodedBuffer(params1.getEncodedBuffer())
      expect(params2.getInputs()).toEqual(params1.getInputs())
      expect(params2.getOutputsLength()).toEqual(params1.getOutputsLength())
      expect(params2.getOutputs()).toEqual(params1.getOutputs())
      expect(params2.getOutputsObject()).toEqual(params1.getOutputsObject())
      expect(params2.getOutputIndices()).toEqual(params1.getOutputIndices())
    }

    // Verify that second instance matches the first when updated from encoded buffer
    restoreAndVerify()

    // Next update using the impl outputs (which includes 3 variables and therefore
    // requires increasing the length of the outputs array)
    params1.updateFromParams(inputs, implOutputs)
    expect(params1.getInputs()).toEqual(new Float64Array([1, 2, 3]))
    expect(params1.getOutputsLength()).toEqual(9)
    expect(params1.getOutputIndices()).toEqual(
      new Int32Array([
        // _x
        3, 0, 0, 0,
        // _a
        1, 0, 0, 0,
        // _b
        2, 0, 0, 0,
        // (zero terminator)
        0, 0, 0, 0
      ])
    )

    // Verify that second instance matches the first when updated from encoded buffer
    restoreAndVerify()

    // Next update again using the normal outputs; the outputs array should be
    // shorter since it only needs to hold values for 2 variables) and the output
    // indices array should be undefined  since it is not active for this run
    params1.updateFromParams(inputs, normalOutputs)
    expect(params1.getInputs()).toEqual(new Float64Array([1, 2, 3]))
    expect(params1.getOutputsLength()).toEqual(6)
    expect(params1.getOutputIndices()).toBeUndefined()

    // Verify that second instance matches the first when updated from encoded buffer
    restoreAndVerify()
  })

  it('should copy inputs', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const runnerParams = new BufferedRunModelParams()
    const workerParams = new BufferedRunModelParams()

    runnerParams.updateFromParams(inputs, outputs)
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    let array: Float64Array
    const create = (numElements: number) => {
      array = new Float64Array(numElements)
      return array
    }

    // Verify case where existing array is undefined
    workerParams.copyInputs(undefined, create)
    expect(array).toEqual(new Float64Array([1, 2, 3]))

    // Verify case where existing array is too small
    array = new Float64Array(2)
    workerParams.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3]))

    // Verify case where existing array is large enough
    array = new Float64Array([6, 6, 6, 6])
    workerParams.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3, 6]))

    // Verify case where params are updated with an empty inputs array.  Note that
    // it is expected that the existing data is retained in the destination array;
    // it is up to the calling code to clear or ignore that existing data.
    runnerParams.updateFromParams([], outputs)
    runnerParams.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3, 6]))
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())
    workerParams.copyInputs(array, create)
    expect(array).toEqual(new Float64Array([1, 2, 3, 6]))
  })

  it('should copy output indices', () => {
    const listing = new ModelListing(JSON.parse(listingJson))
    const inputs = [1, 2, 3]
    const normalOutputs = new Outputs(['_x', '_y'], 2000, 2002, 1)
    const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_a', '_b'])

    const runnerParams = new BufferedRunModelParams()
    const workerParams = new BufferedRunModelParams()

    runnerParams.updateFromParams(inputs, implOutputs)
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

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
    workerParams.copyOutputIndices(undefined, create)
    expect(array).toEqual(expectedIndices)

    // Verify case where existing array is too small
    array = new Int32Array(2)
    workerParams.copyOutputIndices(array, create)
    expect(array).toEqual(expectedIndices)

    // Verify case where existing array is large enough
    array = new Int32Array(20).fill(6)
    workerParams.copyOutputIndices(array, create)
    expect(array).toEqual(
      new Int32Array([
        // _x
        3, 0, 0, 0,
        // _a
        1, 0, 0, 0,
        // _b
        2, 0, 0, 0,
        // (zero terminator)
        0, 0, 0, 0,
        // (existing data)
        6, 6, 6, 6
      ])
    )
  })

  it('should store output values from the model run', () => {
    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const runnerParams = new BufferedRunModelParams()
    const workerParams = new BufferedRunModelParams()

    // Run once
    runnerParams.updateFromParams(inputs, outputs)
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    // Pretend that the model writes the following values to its outputs buffer then
    // calls the `store` methods
    const outputsArray = new Float64Array([1, 2, 3, 4, 5, 6])
    workerParams.storeElapsedTime(42)
    workerParams.storeOutputs(outputsArray)

    // Verify that the elapsed time can be accessed in the runner params
    expect(runnerParams.getElapsedTime()).toBe(42)

    // Verify that the outputs buffer in the runner params contains the correct values
    expect(runnerParams.getOutputs()).toEqual(new Float64Array([1, 2, 3, 4, 5, 6]))

    // Copy the outputs buffer to the `Outputs` instance and verify the values
    runnerParams.finalizeOutputs(outputs)
    expect(outputs.getSeriesForVar('_x').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outputs.getSeriesForVar('_y').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
    expect(outputs.runTimeInMillis).toBe(42)
  })

  it('should copy lookups', () => {
    const listing = new ModelListing(JSON.parse(listingJson))

    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2002, 1)

    const lookups: LookupDef[] = [
      // Reference the first variable by name
      createLookupDef({ varName: 'A' }, [p(2000, 0), p(2001, 1), p(2002, 2)]),
      // Reference the second variable by ID
      createLookupDef({ varId: '_b' }, [p(2000, 5), p(2001, 6), p(2002, 7)])
    ]

    const runnerParams = new BufferedRunModelParams(listing)
    const workerParams = new BufferedRunModelParams(listing)

    // Run once without providing lookups
    runnerParams.updateFromParams(inputs, outputs)
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    // Verify that lookups array is undefined
    expect(workerParams.getLookups()).toBeUndefined()

    // Run again with lookups
    runnerParams.updateFromParams(inputs, outputs, { lookups })
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    // Verify that lookups array on the worker side contains the expected values
    expect(workerParams.getLookups()).toEqual([
      createLookupDef({ varSpec: { varIndex: 1 } }, [p(2000, 0), p(2001, 1), p(2002, 2)]),
      createLookupDef({ varSpec: { varIndex: 2 } }, [p(2000, 5), p(2001, 6), p(2002, 7)])
    ])

    // Run again without lookups
    runnerParams.updateFromParams(inputs, outputs)
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    // Verify that lookups array is undefined
    expect(workerParams.getLookups()).toBeUndefined()

    // Run again with an empty lookup.  This time we reference the variable by spec.
    const emptyLookup = createLookupDef({ varSpec: listing.varSpecs.get('_a') }, [])
    runnerParams.updateFromParams(inputs, outputs, {
      lookups: [emptyLookup]
    })
    workerParams.updateFromEncodedBuffer(runnerParams.getEncodedBuffer())

    // Verify that lookups array on the worker side contains the expected values
    expect(workerParams.getLookups()).toEqual([emptyLookup])
  })
})
