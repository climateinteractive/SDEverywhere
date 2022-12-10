// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { WasmModule } from '../wasm-model'
import { initWasmModelAndBuffers } from '../wasm-model'

import { createInputValue } from './inputs'
import type { ModelRunner } from './model-runner'
import { createWasmModelRunner } from './model-runner'

function createMockWasmModel() {
  // This is a mock WasmModule that is sufficient for testing communication between the
  // async runner and worker
  const heap = new Float64Array(1000)
  let mallocOffset = 0
  const wasmModule: WasmModule = {
    cwrap: fname => {
      // Return a mock implementation of each wrapped C function
      switch (fname) {
        case 'getInitialTime':
          return () => 2000
        case 'getFinalTime':
          return () => 2100
        case 'getSaveper':
          return () => 1
        case 'runModelWithBuffers':
          return (_inputsAddress: number, outputsAddress: number) => {
            // The outputsAddress is in bytes, so convert to float64 offset
            const outputsOffset = outputsAddress / 8
            // Store a value in 2000 for the first output series
            heap.set([6], outputsOffset)
            // Store a value in 2100 for the second output series
            heap.set([7], outputsOffset + 201)
          }
        default:
          throw new Error(`Unhandled call to cwrap with function name '${fname}'`)
      }
    },
    _malloc: lengthInBytes => {
      const currentOffset = mallocOffset
      mallocOffset += lengthInBytes
      return currentOffset
    },
    _free: () => undefined,
    HEAPF64: heap
  }
  return initWasmModelAndBuffers(wasmModule, 3, ['_output_1', '_output_2'])
}

describe('createWasmModelRunner', () => {
  let runner: ModelRunner

  beforeEach(async () => {
    runner = createWasmModelRunner(createMockWasmModel())
  })

  afterEach(async () => {
    if (runner) {
      await runner.terminate()
    }
  })

  it('should run the model', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 0), createInputValue('_input_2', 0), createInputValue('_input_3', 0)]
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(6)
    expect(outOutputs.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(7)
  })

  it('should throw an error if runModel is called after the runner has been terminated', async () => {
    expect(runner).toBeDefined()

    await runner.terminate()

    const outputs = runner.createOutputs()
    await expect(runner.runModel([], outputs)).rejects.toThrow('Model runner has already been terminated')
  })
})
