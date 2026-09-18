// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { ModelRunner } from '@sdeverywhere/runtime'
import { BufferedRunModelParams, ModelListing, Outputs } from '@sdeverywhere/runtime'

import { createModelWorkerClient } from './worker-rpc/model-worker-rpc'
import type { InitResult } from './worker-rpc/model-worker-rpc'
import type { WorkerSpec } from './worker-rpc/spawn-worker'
import { spawnWorker } from './worker-rpc/spawn-worker'
import type { WorkerHandle } from './worker-rpc/worker-port'

export type { WorkerSpec }

/**
 * Initialize a `ModelRunner` that runs the model asynchronously in a worker
 * (a Web Worker when running in a browser environment, or a worker thread
 * when running in a Node.js environment).
 *
 * In your app project, define a JavaScript file, called `worker.js` for example,
 * that initializes the generated model in the context of a worker thread:
 *
 * ```js
 * import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'
 * import loadGeneratedModel from './sde-prep/generated-model.js'
 *
 * exposeModelWorker(loadGeneratedModel)
 * ```
 *
 * Then, in your web app, call the `spawnAsyncModelRunner` function, which
 * will spawn the worker thread and initialize the `ModelRunner` that communicates
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
export async function spawnAsyncModelRunner(workerSpec: WorkerSpec): Promise<ModelRunner> {
  return spawnAsyncModelRunnerWithWorker(spawnWorker(workerSpec))
}

/**
 * @hidden For internal use only
 */
async function spawnAsyncModelRunnerWithWorker(worker: WorkerHandle): Promise<ModelRunner> {
  // Create the client that communicates with the `ModelWorker` running in the worker
  const client = createModelWorkerClient(worker)

  // Wait for the worker to initialize the model (in the worker thread). If
  // initialization fails, make sure the worker and any associated resources are
  // released before propagating the original error.
  let initResult: InitResult
  try {
    initResult = await client.initModel()
  } catch (error) {
    try {
      await worker.terminate()
    } catch {
      // Preserve the model initialization error if worker termination also fails
    }
    throw error
  }

  // Create a `ModelListing` instance if the listing was defined in the generated model
  const modelListing = initResult.modelListing ? new ModelListing(initResult.modelListing) : undefined

  // Maintain a `BufferedRunModelParams` instance that holds the I/O parameters
  const params = new BufferedRunModelParams(modelListing)

  // Use a flag to ensure that only one request is made at a time
  let running = false

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  return {
    createOutputs: () => {
      return new Outputs(initResult.outputVarIds, initResult.startTime, initResult.endTime, initResult.saveFreq)
    },

    runModel: async (inputs, outputs, options) => {
      if (terminated) {
        throw new Error('Async model runner has already been terminated')
      } else if (running) {
        throw new Error('Async model runner only supports one `runModel` call at a time')
      } else {
        running = true
      }

      // Update the I/O parameters
      params.updateFromParams(inputs, outputs, options)

      // Run the model in the worker. We transfer the underlying `ArrayBuffer`
      // instance to the worker to make it no-copy transferable, and then the
      // worker will transfer it back to us.
      let ioBuffer: ArrayBuffer
      try {
        const buffer = params.getEncodedBuffer()
        ioBuffer = await client.runModel(buffer)
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
        client.dispose(new Error('Async model runner has already been terminated'))
        return worker.terminate()
      }
    }
  }
}
