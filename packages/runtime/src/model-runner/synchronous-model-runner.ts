// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { type InputValue, Outputs } from '../_shared'
import { RunModelParams, type RunModelOptions, type RunnableModel } from '../runnable-model'
import type { ModelRunner } from './model-runner'

/**
 * Create a `ModelRunner` that runs the given model on the JS thread.
 *
 * @param model The runnable model instance.
 */
export function createSynchronousModelRunner(model: RunnableModel): ModelRunner {
  // Maintain a `RunModelParams` instance that encapsulates the buffers
  const params = new RunModelParams()

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  const runModelSync = (inputs: (InputValue | number)[], outputs: Outputs, options?: RunModelOptions) => {
    // Update the params
    params.updateFromParams(inputs, outputs, options)

    // Run the model synchronously using those params
    model.runModel(params)

    return outputs
  }

  return {
    createOutputs: () => {
      return new Outputs(model.outputVarIds, model.startTime, model.endTime, model.saveFreq)
    },

    runModel: (inputs, outputs, options) => {
      if (terminated) {
        return Promise.reject(new Error('Model runner has already been terminated'))
      }
      return Promise.resolve(runModelSync(inputs, outputs, options))
    },

    runModelSync: (inputs, outputs, options) => {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      return runModelSync(inputs, outputs, options)
    },

    terminate: () => {
      if (!terminated) {
        // TODO: Release wasm-related resources (module or buffers)
        terminated = true
      }
      return Promise.resolve()
    }
  }
}
