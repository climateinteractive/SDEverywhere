// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createInputValue } from '../_shared'

import type { WasmModule } from '../wasm-model'
import { initWasmModel } from '../wasm-model'

import type { ModelRunner } from './model-runner'
import { createSynchronousModelRunner } from './synchronous-model-runner'

function createMockWasmModel() {
  // This is a mock WasmModule that is sufficient for testing the synchronous runner implementation
  const heapI32 = new Int32Array(1000)
  const heapF64 = new Float64Array(1000)
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
            heapF64.set([6], outputsOffset)
            // Store a value in 2100 for the second output series
            heapF64.set([7], outputsOffset + 201)
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
    HEAP32: heapI32,
    HEAPF64: heapF64
  }
  return initWasmModel(wasmModule, ['_output_1', '_output_2'])
}

describe('createSynchronousModelRunner', () => {
  let runner: ModelRunner

  beforeEach(async () => {
    runner = createSynchronousModelRunner(createMockWasmModel())
  })

  afterEach(async () => {
    if (runner) {
      await runner.terminate()
    }
  })

  it('should run the model (with inputs specified with InputValue array)', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 0), createInputValue('_input_2', 0), createInputValue('_input_3', 0)]
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(6)
    expect(outOutputs.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(7)
  })

  it('should run the model (with inputs specified with number array)', async () => {
    throw new Error('not yet implemented')
  })

  it('should run the model (with input indices buffer)', async () => {
    throw new Error('not yet implemented')
  })

  it('should run the model (with output indices buffer)', async () => {
    throw new Error('not yet implemented')
  })

  it('should throw an error if runModel is called after the runner has been terminated', async () => {
    expect(runner).toBeDefined()

    await runner.terminate()

    const outputs = runner.createOutputs()
    await expect(runner.runModel([], outputs)).rejects.toThrow('Model runner has already been terminated')
  })
})
