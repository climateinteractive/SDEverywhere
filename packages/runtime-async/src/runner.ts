// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { BlobWorker, spawn, Thread, Transfer, Worker } from 'threads'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { Outputs } from '@sdeverywhere/runtime'

/**
 * Initialize a `ModelRunner` that runs the model asynchronously in a worker thread.
 *
 * In your app project, define a JavaScript file, called `worker.js` for example, that
 * initializes the model worker in the context of the Web Worker:
 *
 * ```js
 * import { initWasmModelAndBuffers } from '@sdeverywhere/runtime'
 * import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'
 *
 * async function initWasmModel() {
 *   const wasmModules = loadWasm()
 *   return initWasmModelAndBuffers(...)
 * }
 *
 * exposeModelWorker(initWasmModel)
 * ```
 *
 * Then, in your web app, call the `spawnAsyncModelRunner` function, which
 * will spawn the Web Worker and initialize the `ModelRunner` that communicates
 * with the worker:
 *
 * ```js
 * import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async/runner'
 *
 * async function initApp() {
 *   // ...
 *   const runner = await spawnAsyncModelRunner({ path: './worker.js' })
 *   // ...
 * }
 * ```
 *
 * @param workerSpec Either a `path` to the worker JavaScript file, or the `source`
 * containing the full JavaScript source of the worker.
 */
export async function spawnAsyncModelRunner(workerSpec: { path: string } | { source: string }): Promise<ModelRunner> {
  if (workerSpec['path']) {
    return spawnAsyncModelRunnerWithWorker(new Worker(workerSpec['path']))
  } else {
    return spawnAsyncModelRunnerWithWorker(BlobWorker.fromText(workerSpec['source']))
  }
}

/**
 * @hidden For internal use only
 */
async function spawnAsyncModelRunnerWithWorker(worker: Worker): Promise<ModelRunner> {
  // Spawn the given Worker that contains the `ModelWorker`
  const modelWorker = await spawn(worker)

  // Wait for the worker to initialize the wasm model (in the worker thread)
  const initResult = await modelWorker.initModel()
  let ioBuffer: ArrayBuffer = initResult.ioBuffer

  // The row length is the number of elements in each row of the outputs buffer
  const rowLength = initResult.rowLength

  // Use a flag to ensure that only one request is made at a time
  let running = false

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  return {
    createOutputs: () => {
      return new Outputs(initResult.outputVarIds, initResult.startTime, initResult.endTime, initResult.saveFreq)
    },

    runModel: async (inputs, outputs) => {
      if (terminated) {
        throw new Error('Async model runner has already been terminated')
      } else if (running) {
        throw new Error('Async model runner only supports one `runModel` call at a time')
      } else {
        running = true
      }

      // The run time is stored in the first 8 bytes
      const runTimeLengthInElements = 1
      const runTimeLengthInBytes = runTimeLengthInElements * 8

      // Capture the current set of input values into the reusable buffer
      const inputsLengthInElements = inputs.length
      const inputsLengthInBytes = inputsLengthInElements * 8
      const inputsArray = new Float64Array(ioBuffer, runTimeLengthInBytes, inputsLengthInElements)
      for (let i = 0; i < inputs.length; i++) {
        inputsArray[i] = inputs[i].get()
      }

      // Run the model in the worker. We pass the underlying `ArrayBuffer`
      // instance back to the worker wrapped in a `Transfer` to make it
      // no-copy transferable, and then the worker will return it back
      // to us.
      try {
        ioBuffer = await modelWorker.runModel(Transfer(ioBuffer))
      } finally {
        running = false
      }

      // Save the model run time
      const runTimeBufferArray = new Float64Array(ioBuffer, 0, runTimeLengthInElements)
      outputs.runTimeInMillis = runTimeBufferArray[0]

      // Capture the outputs array by copying the data into the given `Outputs`
      // data structure
      const outputsOffsetInBytes = runTimeLengthInBytes + inputsLengthInBytes
      const outputsArray = new Float64Array(ioBuffer, outputsOffsetInBytes)
      outputs.updateFromBuffer(outputsArray, rowLength)

      return outputs
    },

    terminate: () => {
      if (terminated) {
        return Promise.resolve()
      } else {
        terminated = true
        return Thread.terminate(modelWorker)
      }
    }
  }
}
