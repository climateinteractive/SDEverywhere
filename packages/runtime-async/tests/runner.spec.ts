// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { createInputValue } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '../src/runner'

//
// Note that the Node worker implementation below must use `require` and relies
// on the compiled (JavaScript / CommonJS) versions of the `runtime` and
// `runtime-async` packages, which is why this test file is treated as an
// integration test and kept in the separate `tests` directory.  It must be
// run only after the `runtime` and `runtime-async` have been built.
//

const workerSource = `
const path = require('path')
const { initWasmModelAndBuffers } = require('@sdeverywhere/runtime')
const { exposeModelWorker } = require('@sdeverywhere/runtime-async')

function initWasmModel() {
  // This is a mock WasmModule that is sufficient for testing communication between the
  // async runner and worker
  const heapI32 = new Int32Array(1000)
  const heapF64 = new Float64Array(1000)
  let mallocOffset = 0
  const wasmModule = {
    cwrap: (fname) => {
      // Return a mock implementation of each wrapped C function
      switch (fname) {
        case 'getMaxOutputIndices':
          return () => 1000
        case 'getInitialTime':
          return () => 2000
        case 'getFinalTime':
          return () => 2100
        case 'getSaveper':
          return () => 1
        case 'runModelWithBuffers':
          return (inputsAddress, outputsAddress) => {
            // The outputsAddress is in bytes, so convert to float64 offset
            const outputsOffset = outputsAddress / 8
            // Store a value in 2000 for the first output series
            heapF64.set([6], outputsOffset)
            // Store a value in 2100 for the second output series
            heapF64.set([7], outputsOffset + 201)
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
  return initWasmModelAndBuffers(wasmModule, 3, ['_output_1', '_output_2'])
}
exposeModelWorker(initWasmModel)
`

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

  it('should run the model in a worker', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 0), createInputValue('_input_2', 0), createInputValue('_input_3', 0)]
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1')?.getValueAtTime(2000)).toBe(6)
    expect(outOutputs.getSeriesForVar('_output_2')?.getValueAtTime(2100)).toBe(7)
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
