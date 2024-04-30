// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { BlobWorker, spawn, Thread, Transfer, Worker } from 'threads'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { Outputs, updateVarIndices } from '@sdeverywhere/runtime'

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

  // The run time is stored in the first 8 bytes of the shared buffer
  const runTimeOffsetInBytes = 0
  const runTimeLengthInElements = 1
  const runTimeLengthInBytes = runTimeLengthInElements * 8

  // The inputs are stored after the run time in the shared buffer
  const inputsOffsetInBytes = runTimeOffsetInBytes + runTimeLengthInBytes
  const inputsLengthInElements: number = initResult.inputsLength
  const inputsLengthInBytes = inputsLengthInElements * 8

  // The outputs are stored after the inputs in the shared buffer
  const outputsOffsetInBytes = inputsOffsetInBytes + inputsLengthInBytes
  const outputsLengthInElements: number = initResult.outputsLength
  const outputsLengthInBytes = outputsLengthInElements * 8

  // The output indices are (optionally) stored after the outputs in the shared buffer
  const indicesOffsetInBytes = outputsOffsetInBytes + outputsLengthInBytes
  const indicesLengthInElements: number = initResult.outputIndicesLength

  // The row length is the number of elements in each row of the outputs buffer
  const outputRowLength: number = initResult.outputRowLength

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

      // Capture the current set of input values into the reusable buffer
      const inputsArray = new Float64Array(ioBuffer, inputsOffsetInBytes, inputsLengthInElements)
      for (let i = 0; i < inputs.length; i++) {
        inputsArray[i] = inputs[i].get()
      }

      // Update the output indices, if needed
      if (indicesLengthInElements > 0) {
        const outputSpecs = outputs.varSpecs || []
        const indicesArray = new Int32Array(ioBuffer, indicesOffsetInBytes, indicesLengthInElements)
        updateVarIndices(indicesArray, outputSpecs)
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
      const runTimeArray = new Float64Array(ioBuffer, runTimeOffsetInBytes, runTimeLengthInElements)
      outputs.runTimeInMillis = runTimeArray[0]

      // Capture the outputs array by copying the data into the given `Outputs`
      // data structure
      const outputsArray = new Float64Array(ioBuffer, outputsOffsetInBytes, outputsLengthInElements)
      outputs.updateFromBuffer(outputsArray, outputRowLength)

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
