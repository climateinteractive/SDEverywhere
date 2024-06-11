#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createSynchronousModelRunner, ModelListing } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that is largely the same as the `impl-var-access`
 * test, except that this one does not explicitly reference the exogenous `Time` variable.
 * This helps verify that the JSON listing can be created without errors when `Time` is
 * not explicitly referenced.
 */

function verify(runnerKind, outputs, inputX, varId, checkValue) {
  const varName = varId.replaceAll('_', '')
  const series = outputs.getSeriesForVar(varId)
  for (let time = 2000; time <= 2002; time++) {
    const actual = series.getValueAtTime(time)
    const expected = checkValue(time, inputX)
    if (actual !== expected) {
      console.error(
        `Test failed for ${runnerKind} runner at time=${time} with x=${inputX}: expected ${varName}=${expected}, got ${varName}=${actual}`
      )
      process.exit(1)
    }
  }
}

function verifyDeclaredOutputs(runnerKind, outputs, inputX) {
  // T = 10
  // X = 0 [-10,10]
  // Y = X * 3
  // Z = T + Y
  verify(runnerKind, outputs, inputX, '_z', (_, inputX) => 10 + inputX * 3)

  // A[DimA] = 1, 2
  // B[DimB] = 100, 200, 300
  // C[DimA, DimB] = A[DimA] + B[DimB]
  // D[DimA] = X + SUM(C[DimA, DimB!])
  // D[A1] = X + (A[A1] + B[B1]) + (A[A1] + B[B2]) + (A[A1] + B[B3])
  verify(runnerKind, outputs, inputX, '_d[_a1]', (_, inputX) => inputX + 1 + 100 + 1 + 200 + 1 + 300)
}

function verifyImplOutputs(runnerKind, outputs, inputX) {
  // Y = X * 3
  verify(runnerKind, outputs, inputX, '_y', () => inputX * 3)

  // A[DimA] = 1, 2
  // B[DimB] = 100, 200, 300
  // C[DimA, DimB] = A[DimA] + B[DimB]
  verify(runnerKind, outputs, inputX, '_c[_a2,_b2]', () => 2 + 200)
  verify(runnerKind, outputs, inputX, '_c[_a2,_b3]', () => 2 + 300)
}

async function runTests(runnerKind, modelRunner) {
  // Read the JSON model listing
  const listingJson = await readFile(joinPath('sde-prep', 'build', 'processed_min.json'), 'utf8')
  const listing = new ModelListing(JSON.parse(listingJson))

  // Create the set of inputs
  const inputX = createInputValue('_x', 0)
  const inputs = [inputX]

  // Create the buffer to hold the outputs
  let outputs = modelRunner.createOutputs()

  // Run the model with input at default (0)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify declared output variables
  verifyDeclaredOutputs(runnerKind, outputs, 0)

  // Run the model with input at 1
  inputX.set(1)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify declared output variables
  verifyDeclaredOutputs(runnerKind, outputs, 1)

  // Run the model again and capture impl variables
  let outputsWithImpls1 = listing.deriveOutputs(outputs, ['_y', '_c[_a2,_b2]', '_c[_a2,_b3]'])
  outputsWithImpls1 = await modelRunner.runModel(inputs, outputsWithImpls1)

  // Verify impl variables
  verifyImplOutputs(runnerKind, outputsWithImpls1, 1)

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
  // Initialize the asynchronous `ModelRunner` that drives the generated model
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
