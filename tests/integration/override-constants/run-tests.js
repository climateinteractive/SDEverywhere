#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { createInputValue, createConstantDef, createSynchronousModelRunner } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import loadGeneratedModel from './sde-prep/generated-model.js'

/*
 * This is a JS-level integration test that verifies that both the synchronous
 * and asynchronous `ModelRunner` implementations work when overriding constant
 * values at runtime.
 */

function verify(runnerKind, run, outputs, inputX, varId, expectedValue) {
  const varName = varId.replaceAll('_', '')
  const series = outputs.getSeriesForVar(varId)
  if (series === undefined) {
    console.error(`Test failed for ${runnerKind} runner: no outputs found for ${varName}\n`)
    process.exit(1)
  }

  for (let time = 2000; time <= 2002; time++) {
    const actual = series.getValueAtTime(time)
    const expected = expectedValue(time, inputX)
    if (actual !== expected) {
      console.error(
        `Test failed for ${runnerKind} runner for run=${run} at time=${time}: expected ${varName}=${expected}, got ${varName}=${actual}\n`
      )
      process.exit(1)
    }
  }
}

function verifyOutputs(runnerKind, run, outputs, inputX, constantAA1Offset, constantBA2B1Offset) {
  verify(runnerKind, run, outputs, inputX, '_a[_a1]', (time, x) => x + 100 + constantAA1Offset)
  verify(runnerKind, run, outputs, inputX, '_a[_a2]', (time, x) => x + 200)
  verify(runnerKind, run, outputs, inputX, '_b[_a1,_b1]', (time, x) => x + 1)
  verify(runnerKind, run, outputs, inputX, '_b[_a1,_b2]', (time, x) => x + 2)
  verify(runnerKind, run, outputs, inputX, '_b[_a1,_b3]', (time, x) => x + 3)
  verify(runnerKind, run, outputs, inputX, '_b[_a2,_b1]', (time, x) => x + 4 + constantBA2B1Offset)
  verify(runnerKind, run, outputs, inputX, '_b[_a2,_b2]', (time, x) => x + 5)
  verify(runnerKind, run, outputs, inputX, '_b[_a2,_b3]', (time, x) => x + 6)
  verify(runnerKind, run, outputs, inputX, '_c', (time, x) => x + 42)
}

async function runTests(runnerKind, modelRunner) {
  const inputX = createInputValue('_x', 0)
  const inputs = [inputX]

  let outputs = modelRunner.createOutputs()

  // Run 1: Default constant values
  outputs = await modelRunner.runModel(inputs, outputs)
  verifyOutputs(runnerKind, 1, outputs, 0, 0, 0)

  // Run 2: Override a couple constants
  outputs = await modelRunner.runModel(inputs, outputs, {
    constants: [
      createConstantDef({ varName: 'Constant A[A1]' }, 150),
      createConstantDef({ varId: '_constant_b[_a2,_b1]' }, 10)
    ]
  })
  verifyOutputs(runnerKind, 2, outputs, 0, 50, 6)

  // Run 3: Constants do NOT persist (unlike lookups), so they reset to defaults
  outputs = await modelRunner.runModel(inputs, outputs)
  verifyOutputs(runnerKind, 3, outputs, 0, 0, 0)

  // Run 4: Override constants again
  outputs = await modelRunner.runModel(inputs, outputs, {
    constants: [
      createConstantDef({ varId: '_constant_a[_a1]' }, 110)
    ]
  })
  verifyOutputs(runnerKind, 4, outputs, 0, 10, 0)

  // Run 5: Reset one constant back to original by passing the original value
  outputs = await modelRunner.runModel(inputs, outputs, {
    constants: [
      createConstantDef({ varId: '_constant_a[_a1]' }, 100)
    ]
  })
  verifyOutputs(runnerKind, 5, outputs, 0, 0, 0)

  await modelRunner.terminate()
}

async function createSynchronousRunner() {
  global.__dirname = '.'
  const generatedModel = await loadGeneratedModel()
  return createSynchronousModelRunner(generatedModel)
}

async function createAsynchronousRunner() {
  const modelWorkerJs = await readFile(joinPath('sde-prep', 'worker.js'), 'utf8')
  return await spawnAsyncModelRunner({ source: modelWorkerJs })
}

async function main() {
  const syncRunner = await createSynchronousRunner()
  await runTests('synchronous', syncRunner)

  const asyncRunner = await createAsynchronousRunner()
  await runTests('asynchronous', asyncRunner)

  console.log('Tests passed!\n')
}

main()
