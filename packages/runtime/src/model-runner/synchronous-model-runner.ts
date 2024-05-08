// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { type InputValue, Outputs } from '../_shared'
import { ReferencedRunModelParams } from '../runnable-model'
import type { RunnableModel } from '../runnable-model'
import type { WasmModelInitResult } from '../wasm-model'
import type { ModelRunner } from './model-runner'

/**
 * Create a `ModelRunner` that runs the given model on the JS thread.
 *
 * @hidden This is the new replacement for `createWasmModelRunner`; this will be
 * exposed (and the old one deprecated) in a separate set of changes.
 *
 * @param model The runnable model instance.
 */
export function createSynchronousModelRunner(model: RunnableModel): ModelRunner {
  // Maintain a `ReferencedRunModelParams` instance that holds the I/O parameters
  const params = new ReferencedRunModelParams()

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  const runModelSync = (inputs: (InputValue | number)[], outputs: Outputs) => {
    // Update the I/O parameters
    params.updateFromParams(inputs, outputs)

    // Run the model synchronously using those parameters
    model.runModel(params)

    return outputs
  }

  return {
    createOutputs: () => {
      return new Outputs(model.outputVarIds, model.startTime, model.endTime, model.saveFreq)
    },

    runModel: (inputs, outputs) => {
      if (terminated) {
        return Promise.reject(new Error('Model runner has already been terminated'))
      }
      return Promise.resolve(runModelSync(inputs, outputs))
    },

    runModelSync: (inputs, outputs) => {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      return runModelSync(inputs, outputs)
    },

    terminate: async () => {
      if (!terminated) {
        model.terminate()
        terminated = true
      }
    }
  }
}

/**
 * Create a `ModelRunner` that runs the given wasm model on the JS thread.
 *
 * @param wasmResult The result of initializing the wasm model.
 */
export function createWasmModelRunner(wasmResult: WasmModelInitResult): ModelRunner {
  return createSynchronousModelRunner(wasmResult.model)
}
