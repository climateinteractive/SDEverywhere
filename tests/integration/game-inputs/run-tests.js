#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createLookupDef, createSynchronousModelRunner } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work when providing GAME function
 * inputs at runtime.
 */

function verify(runnerKind, run, outputs, varId, expectedValues) {
  const varName = varId.replaceAll('_', '')
  const series = outputs.getSeriesForVar(varId)
  if (series === undefined) {
    console.error(`Test failed for ${runnerKind} runner: no outputs found for ${varName}\n`)
    process.exit(1)
  }
  for (let time = 2000; time <= 2002; time++) {
    const actual = series.getValueAtTime(time)
    const expected = expectedValues[time - 2000]
    if (actual !== expected) {
      console.error(
        `Test failed for ${runnerKind} runner for run=${run} at time=${time}: expected ${varName}=${expected}, got ${varName}=${actual}\n`
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

  // Verify declared output variables
  verify(runnerKind, 1, outputs, '_y[_a1]', [100, 200, 300])
  verify(runnerKind, 1, outputs, '_y[_a2]', [100, 200, 300])

  // Run the model with game inputs supplied for one variable.  Note that the
  // lookup does not contain a data point for the year 2000, so the `GAME`
  // function should fall back on the value of the "default" argument for
  // that year.
  const p = (x, y) => ({ x, y })
  outputs = await modelRunner.runModel(inputs, outputs, {
    lookups: [createLookupDef({ varName: 'Y game inputs[A1]' }, [p(2001, 260), p(2002, 360)])]
  })

  // Verify that the game inputs are reflected in the first output variable
  // but not the second
  verify(runnerKind, 2, outputs, '_y[_a1]', [100, 260, 360])
  verify(runnerKind, 2, outputs, '_y[_a2]', [100, 200, 300])

  // Run the model again, but without specifying game inputs
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify that the game inputs are still in effect
  verify(runnerKind, 3, outputs, '_y[_a1]', [100, 260, 360])
  verify(runnerKind, 3, outputs, '_y[_a2]', [100, 200, 300])

  // Run the model with empty game inputs for the one variable
  outputs = await modelRunner.runModel(inputs, outputs, {
    lookups: [createLookupDef({ varName: 'Y game inputs[A1]' }, [])]
  })

  // Verify that the empty game inputs lookup is in effect
  verify(runnerKind, 4, outputs, '_y[_a1]', [100, 200, 300])
  verify(runnerKind, 4, outputs, '_y[_a2]', [100, 200, 300])

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
  const expectedVarIds = ['_y[_a1]', '_y[_a2]']
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
  // TODO: Verify JSON

  // Verify with the synchronous model runner
  const syncRunner = await createSynchronousRunner()
  await runTests('synchronous', syncRunner)

  // Verify with the asynchronous model runner
  const asyncRunner = await createAsynchronousRunner()
  await runTests('asynchronous', asyncRunner)

  console.log('Tests passed!\n')
}

main()
