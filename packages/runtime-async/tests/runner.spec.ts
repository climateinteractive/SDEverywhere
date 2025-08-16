// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { ModelListing, createInputValue, createLookupDef } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '../src/runner'

const listingJson = `
{
  "dimensions": [
  ],
  "variables": [
    {
      "id": "_output_1",
      "index": 1
    },
    {
      "id": "_output_2",
      "index": 2
    },
    {
      "id": "_x",
      "index": 3
    },
    {
      "id": "_output_1_data",
      "index": 4
    },
    {
      "id": "_output_2_data",
      "index": 5
    }
  ]
}
`

//
// Note that the Node worker implementation below must use `require` and relies
// on the compiled (JavaScript / CommonJS) versions of the `runtime` and
// `runtime-async` packages, which is why this test file is treated as an
// integration test and kept in the separate `tests` directory.  It must be
// run only after the `runtime` and `runtime-async` have been built.
//

const workerWithMockJsModel = `\
const path = require('path')
const { MockJsModel } = require('@sdeverywhere/runtime')
const { exposeModelWorker } = require('@sdeverywhere/runtime-async')

const startTime = 2000
const endTime = 2002

function createMockJsModel() {
  return new MockJsModel({
    initialTime: startTime,
    finalTime: endTime,
    outputVarIds: ['_output_1', '_output_2'],
    listingJson: \`${listingJson}\`,
    onEvalAux: (vars, lookups) => {
      const time = vars.get('_time')
      if (lookups.size > 0) {
        const lookup1 = lookups.get('_output_1_data')
        const lookup2 = lookups.get('_output_2_data')
        // expect(lookup1).toBeDefined()
        // expect(lookup2).toBeDefined()
        vars.set('_output_1', lookup1.getValueForX(time, 'interpolate'))
        vars.set('_output_2', lookup2.getValueForX(time, 'interpolate'))
      } else {
        vars.set('_output_1', time - startTime + 1)
        vars.set('_output_2', time - startTime + 4)
        vars.set('_x', time - startTime + 7)
      }
    }
  })
}

exposeModelWorker(createMockJsModel)
`

const workerWithMockWasmModule = `\
const path = require('path')
const { MockWasmModule } = require('@sdeverywhere/runtime')
const { exposeModelWorker } = require('@sdeverywhere/runtime-async')

const startTime = 2000
const endTime = 2002

async function createMockWasmModule() {
  return new MockWasmModule({
    initialTime: startTime,
    finalTime: endTime,
    outputVarIds: ['_output_1', '_output_2'],
    listingJson: \`${listingJson}\`,
    onRunModel: (inputs, outputs, lookups, outputIndices) => {
      if (lookups.size > 0) {
        // Pretend that outputs are derived from lookup data
        const lookup1 = lookups.get('_output_1_data')
        const lookup2 = lookups.get('_output_2_data')
        // expect(lookup1).toBeDefined()
        // expect(lookup2).toBeDefined()
        for (let i = 0; i < 3; i++) {
          outputs[i] = lookup1.getValueForX(2000 + i, 'interpolate')
          outputs[i + 3] = lookup2.getValueForX(2000 + i, 'interpolate')
        }
      } else {
        if (outputIndices === undefined) {
          // Store 3 values for the _output_1, and 3 for _output_2
          outputs.set([1, 2, 3, 4, 5, 6])
        } else {
          // Store 3 values for each of the three variables
          outputs.set([7, 8, 9, 4, 5, 6, 1, 2, 3])
        }
      }
    }
  })
}

exposeModelWorker(createMockWasmModule)
`

const p = (x: number, y: number) => {
  return {
    x,
    y
  }
}

describe.each([
  // Run the tests once with a mock JS model
  { kind: 'js' },
  // Run the tests once with a mock Wasm module
  { kind: 'wasm' }
])('spawnAsyncModelRunner (with mock $kind model)', ({ kind }) => {
  let runner: ModelRunner

  beforeEach(async () => {
    let workerSource: string
    switch (kind) {
      case 'js':
        workerSource = workerWithMockJsModel
        break
      case 'wasm':
        workerSource = workerWithMockWasmModule
        break
      default:
        throw new Error('Unhandled mock kind')
    }
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

  it('should run the model (with empty inputs array)', async () => {
    expect(runner).toBeDefined()
    const inOutputs = runner.createOutputs()
    const outOutputs = await runner.runModel([], inOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_output_1')!.points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outOutputs.getSeriesForVar('_output_2')!.points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
  })

  it('should run the model (with lookup overrides)', async () => {
    const inputs = [createInputValue('_input_1', 7), createInputValue('_input_2', 8), createInputValue('_input_3', 9)]
    let outputs = runner.createOutputs()

    // Run once without lookup overrides
    outputs = await runner.runModel(inputs, outputs)

    // Verify that outputs contain the original values
    expect(outputs.getSeriesForVar('_output_1')!.points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
    expect(outputs.getSeriesForVar('_output_2')!.points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])

    // Run again, this time with lookup overrides
    const lookup1Points = [p(2000, 101), p(2001, 102), p(2002, 103)]
    const lookup2Points = [p(2000, 104), p(2001, 105), p(2002, 106)]
    outputs = await runner.runModel(inputs, outputs, {
      lookups: [
        createLookupDef({ varId: '_output_1_data' }, lookup1Points),
        createLookupDef({ varId: '_output_2_data' }, lookup2Points)
      ]
    })

    // Verify that outputs contain the values from the overridden lookups
    expect(outputs.getSeriesForVar('_output_1')!.points).toEqual(lookup1Points)
    expect(outputs.getSeriesForVar('_output_2')!.points).toEqual(lookup2Points)

    // Run again without lookup overrides
    outputs = await runner.runModel(inputs, outputs)

    // Verify that the lookup overrides are still in effect from the previous run
    expect(outputs.getSeriesForVar('_output_1')!.points).toEqual(lookup1Points)
    expect(outputs.getSeriesForVar('_output_2')!.points).toEqual(lookup2Points)
  })

  it('should run the model in a worker (when output var specs are included)', async () => {
    const listing = new ModelListing(JSON.parse(listingJson))
    const inputs = [7, 8, 9]
    const normalOutputs = runner.createOutputs()
    const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_output_2', '_output_1'])
    const outOutputs = await runner.runModel(inputs, implOutputs)
    expect(outOutputs).toBeDefined()
    expect(outOutputs.runTimeInMillis).toBeGreaterThan(0)
    expect(outOutputs.getSeriesForVar('_x')!.points).toEqual([p(2000, 7), p(2001, 8), p(2002, 9)])
    expect(outOutputs.getSeriesForVar('_output_2')!.points).toEqual([p(2000, 4), p(2001, 5), p(2002, 6)])
    // expect(outOutputs.getSeriesForVar('_output_1')!.points).toEqual([p(2000, 1), p(2001, 2), p(2002, 3)])
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
