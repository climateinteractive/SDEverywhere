// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createInputValue } from '../_shared'

import type { WasmModule } from '../wasm-model'
import { initWasmModel } from '../wasm-model'

import type { RunnableModel } from '../runnable-model'
// import { BaseRunnableModel } from '../runnable-model/base-runnable-model'

import type { ModelRunner } from './model-runner'
import { createSynchronousModelRunner } from './synchronous-model-runner'
import { ModelListing } from './model-listing'
import { initJsModel } from '../js-model'
import { MockJsModel } from '../js-model/_mocks/mock-js-model'

const startTime = 2000
const endTime = 2002

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
          return () => startTime
        case 'getFinalTime':
          return () => endTime
        case 'getSaveper':
          return () => 1
        case 'runModelWithBuffers':
          return (inputsAddress: number, outputsAddress: number, outputIndicesAddress: number) => {
            // These address values are in bytes, so convert to float64 offset
            const inputsOffset = inputsAddress / 8
            const outputsOffset = outputsAddress / 8

            // This address is in bytes too, so convert to int32 offset
            const outputIndicesOffset = outputIndicesAddress / 4

            // Verify inputs
            const inputs = heapF64.slice(inputsOffset, inputsOffset + 3)
            expect(inputs).toEqual(new Float64Array([7, 8, 9]))

            if (outputIndicesAddress === 0) {
              // Store 3 values for the _output_1, and 3 for _output_2
              heapF64.set([1, 2, 3, 4, 5, 6], outputsOffset)
            } else {
              // Verify output indices
              const outputIndices = heapI32.slice(outputIndicesOffset, outputIndicesOffset + 4 * 4)
              expect(outputIndices).toEqual(
                new Int32Array([
                  // _x
                  3, 0, 0, 0,
                  // _output_2
                  2, 0, 0, 0,
                  // _output_1
                  1, 0, 0, 0,
                  // (zero terminator)
                  0, 0, 0, 0
                ])
              )

              // Store 3 values for each of the three variables
              heapF64.set([7, 8, 9, 4, 5, 6, 1, 2, 3], outputsOffset)
            }
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

function createMockJsRunnableModel(): RunnableModel {
  // return new BaseRunnableModel({
  //   startTime,
  //   endTime,
  //   saveFreq: 1,
  //   numSavePoints: 3,
  //   outputVarIds: ['_output_1', '_output_2'],
  //   onRunModel: (inputs, outputs, options) => {
  //     // Verify inputs
  //     expect(inputs).toEqual(new Float64Array([7, 8, 9]))
  //     if (options?.outputIndices === undefined) {
  //       // Store up to 3 values for each output (fill with undefined after the stop time)
  //       const stopTime = options?.stopAfterTime !== undefined ? options.stopAfterTime : endTime
  //       for (let time = startTime; time <= endTime; time++) {
  //         const i = time - startTime
  //         if (time <= stopTime) {
  //           outputs[i] = i + 1
  //           outputs[i + 3] = i + 4
  //         } else {
  //           outputs[i] = undefined
  //           outputs[i + 3] = undefined
  //         }
  //       }
  //     } else {
  //       // Verify output indices
  //       expect(options.outputIndices).toEqual(
  //         new Int32Array([
  //           // _x
  //           3, 0, 0, 0,
  //           // _output_2
  //           2, 0, 0, 0,
  //           // _output_1
  //           1, 0, 0, 0,
  //           // (zero terminator)
  //           0, 0, 0, 0
  //         ])
  //       )

  //       // Store 3 values for each of the three variables
  //       outputs.set([7, 8, 9, 4, 5, 6, 1, 2, 3])
  //     }
  //   }
  // })

  const jsModel = new MockJsModel({
    initialTime: startTime,
    finalTime: endTime,
    outputVarIds: ['_output_1', '_output_2'],
    onEvalAux: vars => {
      const time = vars.get('_time')
      vars.set('_output_1', time - startTime + 1)
      vars.set('_output_2', time - startTime + 4)
      vars.set('_x', time - startTime + 7)
    }
  })
  return initJsModel(jsModel)
}

const p = (x: number, y: number) => {
  return {
    x,
    y
  }
}

describe.each([
  // { kind: 'wasm', model: createMockWasmModel() },
  { kind: 'js', model: createMockJsRunnableModel() }
])('createSynchronousModelRunner (with mock $kind model)', ({ model }) => {
  let runner: ModelRunner

  beforeEach(async () => {
    runner = createSynchronousModelRunner(model)
  })

  afterEach(async () => {
    if (runner) {
      await runner.terminate()
    }
  })

  it('should run the model (simple case with inputs and outputs only)', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 7), createInputValue('_input_2', 8), createInputValue('_input_3', 9)]
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outOutputs.getSeriesForVar('_output_2').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
  })

  it('should run the model (with an early stop)', async () => {
    expect(runner).toBeDefined()
    const inputs = [createInputValue('_input_1', 7), createInputValue('_input_2', 8), createInputValue('_input_3', 9)]
    const inOutputs = runner.createOutputs()

    // Run once with the default end time
    let outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outOutputs.getSeriesForVar('_output_2').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])

    // Run again with an early stop time and verify that the data points after the stop time
    // have an undefined value
    outOutputs = await runner.runModel(inputs, outOutputs, {
      stopAfterTime: 2001
    })
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').points).toEqual([p(2000, 1), p(2001, 2), p(2002, undefined)])
    expect(outOutputs.getSeriesForVar('_output_2').points).toEqual([p(2000, 4), p(2001, 5), p(2002, undefined)])

    // Run again with the default end time and verify that all data points are defined
    outOutputs = await runner.runModel(inputs, inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outOutputs.getSeriesForVar('_output_2').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
  })

  // TODO: Remove the skip after implementing output indices
  it.skip('should run the model (when output var specs are included)', async () => {
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
    expect(outOutputs.getSeriesForVar('_x').points).toEqual([p(2000, 7), p(2001, 8), p(2002, 9)])
    expect(outOutputs.getSeriesForVar('_output_2').points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
    expect(outOutputs.getSeriesForVar('_output_1').points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
  })

  it('should throw an error if runModel is called after the runner has been terminated', async () => {
    expect(runner).toBeDefined()

    await runner.terminate()

    const outputs = runner.createOutputs()
    await expect(runner.runModel([], outputs)).rejects.toThrow('Model runner has already been terminated')
  })
})
