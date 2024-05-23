#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createSynchronousModelRunner } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work with a generated model
 * that uses a `SAVEPER` value that is not equal to 1.
 */

function verify(runnerKind, outputs, inputY) {
  const series = outputs.getSeriesForVar('_z')
  for (let time = 2000; time <= 2002; time += 0.5) {
    const actualZ = series.getValueAtTime(time)
    const expectedZ = time + inputY
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
  const inputY = createInputValue('_y', 0)
  const inputs = [inputY]

  // Create the buffer to hold the outputs
  let outputs = modelRunner.createOutputs()

  // Run the model with input at default (0)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify outputs
  verify(runnerKind, outputs, 0)

  // Run the model with input at 1
  inputY.set(1)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify outputs
  verify(runnerKind, outputs, 1)

  // Terminate the model runner
  await modelRunner.terminate()
}

async function createSynchronousRunner() {
  // TODO: This test app is using ESM-style modules, and `__dirname` is not defined
  // in an ESM context.  The `generated-model.js` file (if it contains a Wasm model)
  // may contain a reference to `__dirname`, so we need to define it here.  We should
  // fix the generated Wasm file so that it works for either ESM or CommonJS.
  global.__dirname = '.'

  // Initialize the synchronous `ModelRunner` that drives the generated model
  const generatedModel = await loadGeneratedModel()
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
