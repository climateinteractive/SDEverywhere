#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createSynchronousModelRunner, ModelListing } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work with a generated model that
 * allows for accessing internal/impl variables (i.e., was generated with the
 * `customOutputs` flag enabled in the model spec).
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
  // T = TIME
  // X = 0 [-10,10]
  // Y = X * 3
  // Z = T + Y
  verify(runnerKind, outputs, inputX, '_y', () => inputX * 3)
  verify(runnerKind, outputs, inputX, '_z', (time, inputX) => time + inputX * 3)

  // A[DimA] = 1, 2
  // B[DimB] = 100, 200, 300
  // C[DimA, DimB] = A[DimA] + B[DimB]
  // D[DimA] = X + SUM(C[DimA, DimB!])
  // D[A1] = X + (A[A1] + B[B1]) + (A[A1] + B[B2]) + (A[A1] + B[B3])
  verify(runnerKind, outputs, inputX, '_d[_a1]', (_, inputX) => inputX + 1 + 100 + 1 + 200 + 1 + 300)

  // E[DimA, DimB] = D[DimA] + B[DimB]
  verify(runnerKind, outputs, inputX, '_e[_a2,_b1]', () => 2 + 100)
}

function verifyImplOutputs(runnerKind, outputs, inputX, subset) {
  // Y = X * 3
  verify(runnerKind, outputs, inputX, '_y', () => inputX * 3)

  // A[DimA] = 1, 2
  // B[DimB] = 100, 200, 300
  // C[DimA, DimB] = A[DimA] + B[DimB]
  verify(runnerKind, outputs, inputX, '_c[_a2,_b2]', () => 2 + 200)
  verify(runnerKind, outputs, inputX, '_c[_a2,_b3]', () => 2 + 300)

  if (subset > 1) {
    verify(runnerKind, outputs, inputX, '_a[_a1]', () => 1)
    verify(runnerKind, outputs, inputX, '_a[_a2]', () => 2)
  }
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
  verifyDeclaredOutputs(runnerKind, outputs, /*inputX=*/ 0)

  // Run the model with input at 1
  inputX.set(1)
  outputs = await modelRunner.runModel(inputs, outputs)

  // Verify declared output variables
  verifyDeclaredOutputs(runnerKind, outputs, /*inputX=*/ 1)

  // Run the model again and capture impl variables.  This first subset includes
  // fewer variables (3) than the declared outputs (4).  This tests the case where
  // the model allocates an internal outputs buffer of a certain length, and then
  // is run again reusing that same buffer, which is longer than necessary.
  let outputsWithImpls1 = listing.deriveOutputs(outputs, ['_y', '_c[_a2,_b2]', '_c[_a2,_b3]'])
  outputsWithImpls1 = await modelRunner.runModel(inputs, outputsWithImpls1)

  // Verify impl variables (first subset)
  verifyImplOutputs(runnerKind, outputsWithImpls1, /*inputX=*/ 1, /*subset=*/ 1)

  // Run the model again and capture impl variables.  This second subset includes
  // more variables (5) than the declared outputs (4).  This tests the case where
  // the model allocates an internal outputs buffer of a certain length, and then
  // is run again and needs to allocate a larger internal buffer to hold the new
  // amount of outputs.
  let outputsWithImpls2 = listing.deriveOutputs(outputs, ['_y', '_c[_a2,_b2]', '_c[_a2,_b3]', '_a[_a1]', '_a[_a2]'])
  outputsWithImpls2 = await modelRunner.runModel(inputs, outputsWithImpls2)

  // Verify impl variables (second subset)
  verifyImplOutputs(runnerKind, outputsWithImpls2, /*inputX=*/ 1, /*subset=*/ 2)

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
  const expectedVarIds = ['_y', '_z', '_d[_a1]', '_e[_a2,_b1]']
  if (actualVarIds.length !== expectedVarIds.length || !actualVarIds.every((v, i) => v === expectedVarIds[i])) {
    throw new Error(
      `Test failed: outputVarIds [${actualVarIds}] in generated model don't match expected values [${expectedVarIds}]`
    )
  }

  // Initialize the synchronous `ModelRunner` that drives the generated model
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
