// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { GeneratedModel, RunnableModel } from '@sdeverywhere/runtime'
import { BufferedRunModelParams, createRunnableModel } from '@sdeverywhere/runtime'

import type { InitResult, ModelWorkerMethods } from './worker-rpc/model-worker-rpc'
import { serveModelWorker } from './worker-rpc/model-worker-rpc'
import { parentWorkerPort } from './worker-rpc/parent-port'

/** @hidden */
let initGeneratedModel: (initArgs?: unknown) => Promise<GeneratedModel>

/** @hidden */
let runnableModel: RunnableModel

/**
 * Maintain a `BufferedRunModelParams` instance that wraps the transferable buffer
 * containing the I/O parameters.
 * @hidden
 */
const params = new BufferedRunModelParams()

/** @hidden */
const modelWorker: ModelWorkerMethods = {
  async initModel(initArgs?: unknown): Promise<InitResult> {
    if (runnableModel) {
      throw new Error('RunnableModel was already initialized')
    }

    // Initialize the runnable model
    const generatedModel = await initGeneratedModel(initArgs)
    runnableModel = createRunnableModel(generatedModel)

    // Transfer the model metadata to the runner
    return {
      outputVarIds: runnableModel.outputVarIds,
      modelListing: runnableModel.modelListing,
      startTime: runnableModel.startTime,
      endTime: runnableModel.endTime,
      saveFreq: runnableModel.saveFreq
    }
  },

  runModel(ioBuffer: ArrayBuffer): ArrayBuffer {
    if (!runnableModel) {
      throw new Error('RunnableModel must be initialized before running the model in worker')
    }

    // Update the `BufferedRunModelParams` to use the values in the buffer that was transferred
    // from the runner to the worker
    params.updateFromEncodedBuffer(ioBuffer)

    // Run the model synchronously on the worker thread using those I/O parameters
    runnableModel.runModel(params)

    // Transfer the buffer back to the runner
    return ioBuffer
  }
}

/**
 * Expose an object in the current worker thread that communicates with the
 * `ModelRunner` instance running in the main thread.  The exposed worker
 * object will take care of running the model on the worker thread and
 * sending the outputs back to the main thread.
 *
 * @param init The function that initializes the generated model instance that
 * is used in the worker thread.  This is passed the `initArgs` value (if any) that
 * was passed to `spawnAsyncModelRunner` in the main thread.  Note that the function
 * exported by an Emscripten-generated Wasm model can be used directly, in which case
 * `initArgs` (if defined) is used as the Emscripten module argument (for example,
 * `{ wasmBinary }`).
 */
export function exposeModelWorker<InitArgs = unknown>(init: (initArgs?: InitArgs) => Promise<GeneratedModel>): void {
  // Save the initializer, which will be used when the runner calls `initModel`
  // on the worker
  initGeneratedModel = init as (initArgs?: unknown) => Promise<GeneratedModel>

  // Handle the requests that arrive from the runner in the main thread
  serveModelWorker(parentWorkerPort(), modelWorker)
}
