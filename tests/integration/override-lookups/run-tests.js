#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import {
  createInputValue,
  createLookupDef,
  createRunnableModel,
  createSynchronousModelRunner,
  ModelListing
} from '@sdeverywhere/runtime'
// import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadJsModel from './sde-prep/build/processed.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work when overriding lookup
 * data at runtime.
 */

function verify(runnerKind, run, outputs, inputX, varId, checkValue) {
  const varName = varId.replaceAll('_', '')
  const series = outputs.getSeriesForVar(varId)
  if (series === undefined) {
    console.error(`Test failed for ${runnerKind} runner: no outputs found for ${varName}\n`)
    process.exit(1)
  }
  for (let time = 2000; time <= 2002; time++) {
    const actual = series.getValueAtTime(time)
    const expected = checkValue(time, inputX)
    if (actual !== expected) {
      console.error(
        `Test failed for ${runnerKind} runner for run=${run} at time=${time}: expected ${varName}=${expected}, got ${varName}=${actual}\n`
      )
      process.exit(1)
    }
  }
}

function verifyDeclaredOutputs(runnerKind, run, outputs, inputX, dataOffset) {
  const expect = offset => (time, inputX) => inputX + (time - 2000 + 1) * 100 + offset
  verify(runnerKind, run, outputs, inputX, '_a[0]', expect(0 + dataOffset))
  verify(runnerKind, run, outputs, inputX, '_a[1]', expect(1))
  verify(runnerKind, run, outputs, inputX, '_b[0][0]', expect(2))
  verify(runnerKind, run, outputs, inputX, '_b[0][1]', expect(3))
  verify(runnerKind, run, outputs, inputX, '_b[0][2]', expect(4))
  verify(runnerKind, run, outputs, inputX, '_b[1][0]', expect(5 + dataOffset))
  verify(runnerKind, run, outputs, inputX, '_b[1][1]', expect(6))
  verify(runnerKind, run, outputs, inputX, '_b[1][2]', expect(7))
}

async function runTests(runnerKind, modelRunner) {
  // Read the JSON model listing
  const listingJson = await readFile(joinPath('sde-prep', 'build', 'processed.json'), 'utf8')
  const listing = new ModelListing(listingJson)

  // Create the set of inputs
  const inputX = createInputValue('_x', 0)
  const inputs = [inputX]

  // Create the buffer to hold the outputs
  let outputs = modelRunner.createOutputs()

  // Run the model with input at default (0)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify declared output variables
  verifyDeclaredOutputs(runnerKind, 1, outputs, 0, 0)

  // Run the model with data overrides for a couple variables
  const p = (x, y) => ({ x, y })
  outputs = await modelRunner.runModel(inputs, outputs, {
    lookups: [
      createLookupDef(listing.varSpecs.get('_a_data[_a1]'), [p(2000, 160), p(2001, 260), p(2002, 360)]),
      createLookupDef(listing.varSpecs.get('_b_data[_a2,_b1]'), [p(2000, 165), p(2001, 265), p(2002, 365)])
    ]
  })

  // Verify that the data overrides are reflected in the outputs
  verifyDeclaredOutputs(runnerKind, 2, outputs, 0, 60)

  // Run the model again, but without specifying data overrides
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify that the data overrides are still in effect
  verifyDeclaredOutputs(runnerKind, 3, outputs, 0, 60)

  // Terminate the model runner
  await modelRunner.terminate()
}

async function createSynchronousRunner() {
  // Load the generated JS model
  const jsModel = await loadJsModel()
  const actualVarIds = jsModel.getOutputVarIds() || []
  const expectedVarIds = ['_a[0]', '_a[1]', '_b[0][0]', '_b[0][1]', '_b[0][2]', '_b[1][0]', '_b[1][1]', '_b[1][2]']
  if (actualVarIds.length !== expectedVarIds.length || !actualVarIds.every((v, i) => v === expectedVarIds[i])) {
    throw new Error(
      `Test failed: outputVarIds [${actualVarIds}] in generated JS model don't match expected values [${expectedVarIds}]`
    )
  }

  // Initialize the synchronous `ModelRunner` that drives the model
  const runnableModel = createRunnableModel(jsModel)
  return createSynchronousModelRunner(runnableModel)
}

// async function createAsynchronousRunner() {
//   // Initialize the asynchronous `ModelRunner` that drives the Wasm model
//   const modelWorkerJs = await readFile(joinPath('sde-prep', 'worker.js'), 'utf8')
//   return await spawnAsyncModelRunner({ source: modelWorkerJs })
// }

async function main() {
  // TODO: Verify JSON

  // Verify with the synchronous model runner
  const syncRunner = await createSynchronousRunner()
  await runTests('synchronous', syncRunner)

  // TODO: Verify with the asynchronous model runner
  // const asyncRunner = await createAsynchronousRunner()
  // await runTests('asynchronous', asyncRunner)

  console.log('Tests passed!\n')
}

main()
