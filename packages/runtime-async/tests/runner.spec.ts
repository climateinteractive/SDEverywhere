// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { ModelListing, createInputValue } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '../src/runner'

//
// Note that the Node worker implementation below must use `require` and relies
// on the compiled (JavaScript / CommonJS) versions of the `runtime` and
// `runtime-async` packages, which is why this test file is treated as an
// integration test and kept in the separate `tests` directory.  It must be
// run only after the `runtime` and `runtime-async` have been built.
//

const workerSource = `\
const path = require('path')
const { exposeModelWorker } = require('@sdeverywhere/runtime-async')

async function initWasmModule() {
  // This is a mock WasmModule that is sufficient for testing communication between the
  // async runner and worker
  const heapI32 = new Int32Array(1000)
  const heapF64 = new Float64Array(1000)
  let mallocOffset = 0
  const wasmModule = {
    outputVarIds: ['_output_1', '_output_2'],
    cwrap: (fname) => {
      // Return a mock implementation of each wrapped C function
      switch (fname) {
        case 'getInitialTime':
          return () => 2000
        case 'getFinalTime':
          return () => 2002
        case 'getSaveper':
          return () => 1
        case 'runModelWithBuffers':
          return (inputsAddress, outputsAddress, outputIndicesAddress) => {
            // These address values are in bytes, so convert to float64 offset
            const inputsOffset = inputsAddress / 8
            const outputsOffset = outputsAddress / 8

            // This address is in bytes too, so convert to int32 offset
            const outputIndicesOffset = outputIndicesAddress / 4

            if (outputIndicesAddress === 0) {
              // Store 3 values for the _output_1, and 3 for _output_2
              heapF64.set([1, 2, 3, 4, 5, 6], outputsOffset)
            } else {
              // Store 3 values for each of the three variables
              heapF64.set([7, 8, 9, 4, 5, 6, 1, 2, 3], outputsOffset)
            }
          }
        default:
          throw new Error(\`Unhandled call to cwrap with function name '\${fname}'\`)
      }
    },
    _malloc: lengthInBytes => {
      const currentOffset = mallocOffset
      mallocOffset += lengthInBytes
      return currentOffset
    },
    _free: () => undefined,
    HEAP32: heapI32,
    HEAPF64: heapF64
  }
  return wasmModule
}
exposeModelWorker(initWasmModule)
`

const p = (x: number, y: number) => {
  return {
    x,
    y
  }
}

describe('spawnAsyncModelRunner', () => {
  let runner: ModelRunner

  beforeEach(async () => {
    runner = await spawnAsyncModelRunner({ source: workerSource })
  })

  afterEach(async () => {
    if (runner) {
      await runner.terminate()
    }
  })

  it('should run the model in a worker (simple case with inputs and outputs only)', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 7), createInputValue('_input_2', 8), createInputValue('_input_3', 9)]
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1')!.points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outOutputs.getSeriesForVar('_output_2')!.points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
  })

  it('should run the model in a worker (when output var specs are included)', async () => {
    const json = `
{
  "dimensions": [
  ],
  "variables": [
    {
      "refId": "_output_1",
      "varName": "_output_1",
      "varIndex": 1
    },
    {
      "refId": "_output_2",
      "varName": "_output_2",
      "varIndex": 2
    },
    {
      "refId": "_x",
      "varName": "_x",
      "varIndex": 3
    }
  ]
}
`

    const listing = new ModelListing(json)
    const inputs = [7, 8, 9]
    const normalOutputs = runner.createOutputs()
    const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_output_2', '_output_1'])
    const outOutputs = await runner.runModel(inputs, implOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_x')!.points).toEqual([p(2000, 7), p(2001, 8), p(2002, 9)])
    expect(outOutputs.getSeriesForVar('_output_2')!.points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
    expect(outOutputs.getSeriesForVar('_output_1')!.points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
  })

  it('should throw an error if runModel is called after the runner has been terminated', async () => {
    expect(runner).toBeDefined()

    await runner.terminate()

    const outputs = runner.createOutputs()
    await expect(runner.runModel([], outputs)).rejects.toThrow('Async model runner has already been terminated')
  })

  // TODO
  // it('should throw an error if runModel is called while another is already in progress')
})
