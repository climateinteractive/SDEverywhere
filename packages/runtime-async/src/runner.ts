// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { BlobWorker, spawn, Thread, Transfer, Worker } from 'threads'

import type { ModelRunner } from '@sdeverywhere/runtime'
import { BufferedRunModelParams, Outputs } from '@sdeverywhere/runtime'

/**
 * Initialize a `ModelRunner` that runs the model asynchronously in a worker thread.
 *
 * In your app project, define a JavaScript file, called `worker.js` for example, that
 * initializes the generated model in the context of the Web Worker.
 *
 * ```js
 * import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'
 * import loadGeneratedModel from './sde-prep/generated-model.js'
 *
 * exposeModelWorker(loadGeneratedModel)
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

  // Maintain a `BufferedRunModelParams` instance that holds the I/O parameters
  const params = new BufferedRunModelParams()

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

      // Update the I/O parameters
      params.updateFromParams(inputs, outputs)

      // Run the model in the worker. We pass the underlying `ArrayBuffer`
      // instance back to the worker wrapped in a `Transfer` to make it
      // no-copy transferable, and then the worker will return it back
      // to us.
      let ioBuffer: ArrayBuffer
      try {
        ioBuffer = await modelWorker.runModel(Transfer(params.getEncodedBuffer()))
      } finally {
        running = false
      }

      // Once the buffer is transferred to the worker, the buffer in the
      // `BufferedRunModelParams` becomes "detached" and is no longer usable.
      // After the buffer is transferred back from the worker, we need to
      // restore the state of the object to use the new buffer.
      params.updateFromEncodedBuffer(ioBuffer)

      // Copy the output values and elapsed time from the buffer to the
      // `Outputs` instance
      params.finalizeOutputs(outputs)

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
