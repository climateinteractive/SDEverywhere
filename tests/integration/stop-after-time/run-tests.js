#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createSynchronousModelRunner } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work when a "stop after" time
 * is provided to run the model for a portion of the normal time frame.
 */

function verify(runnerKind, outputs, inputY, maxValidTime) {
  const series = outputs.getSeriesForVar('_z')
  for (let time = 2000; time <= 2005; time += 0.5) {
    const actualZ = series.getValueAtTime(time)
    const expectedZ = time <= maxValidTime ? time + inputY : undefined
    if (actualZ !== expectedZ) {
      console.error(
        `Test failed for ${runnerKind} runner at time=${time} with y=${inputY}: expected z=${expectedZ}, got z=${actualZ}`
      )
      process.exit(1)
    }
  }
}

async function runTests(runnerKind, modelRunner) {
  // Create the set of inputs
  const inputX = createInputValue('_x', 0)
  const inputs = [inputX]

  // Create the buffer to hold the outputs
  let outputs = modelRunner.createOutputs()

  // Run the model with input at default (0)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify that outputs are included for [2000, 2005]
  verify(runnerKind, outputs, 0, 2005)

  // Run the model through 2002 instead of 2005 (the default `FINAL TIME`)
  outputs = await modelRunner.runModel(inputs, outputs, { stopAfterTime: 2002 })

  // Verify that outputs are included for [2000, 2005] with undefined values
  // for the times in the range [2002.5, 2005]
  verify(runnerKind, outputs, 0, 2002)

  // Run the model again, but without specifying `stopAfterTime`
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify that outputs are included for [2000, 2005]
  verify(runnerKind, outputs, 0, 2005)

  // Terminate the model runner
  await modelRunner.terminate()
}

async function createSynchronousRunner() {
  // TODO: This test app is using ESM-style modules, and `__dirname` is not defined
  // in an ESM context.  The `generated-model.js` file (if it contains a Wasm model)
  // may contain a reference to `__dirname`, so we need to define it here.  We should
  // fix the generated Wasm file so that it works for either ESM or CommonJS.
  global.__dirname = '.'

  // Load the generated model and verify that it exposes `outputVarIds`
  const generatedModel = await loadGeneratedModel()
  const actualVarIds = generatedModel.outputVarIds || []
  const expectedVarIds = ['_z']
  if (actualVarIds.length !== expectedVarIds.length || !actualVarIds.every((v, i) => v === expectedVarIds[i])) {
    const expected = JSON.stringify(expectedVarIds, null, 2)
    const actual = JSON.stringify(actualVarIds, null, 2)
    throw new Error(
      `Test failed: outputVarIds in generated JS model don't match expected values\nexpected=${expected}\nactual=${actual}`
    )
  }

  // Initialize the synchronous `ModelRunner` that drives the model
  return createSynchronousModelRunner(generatedModel)
}

async function createAsynchronousRunner() {
  // Initialize the aynchronous `ModelRunner` that drives the generated model
  const modelWorkerJs = await readFile(joinPath('sde-prep', 'worker.js'), 'utf8')
  return await spawnAsyncModelRunner({ source: modelWorkerJs })
}

async function main() {
  // Verify with the synchronous model runner
  const syncRunner = await createSynchronousRunner()
  await runTests('synchronous', syncRunner)

  // Verify with the asynchronous model runner
  const asyncRunner = await createAsynchronousRunner()
  await runTests('asynchronous', asyncRunner)

  console.log('Tests passed!\n')
}

main()
