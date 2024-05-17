// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { type InputValue, Outputs } from '../_shared'
import type { RunModelOptions, RunnableModel } from '../runnable-model'
import { ReferencedRunModelParams } from '../runnable-model'
import type { ModelRunner } from './model-runner'

/**
 * Create a `ModelRunner` that runs the given model on the JS thread.
 *
 * @param model The runnable model instance.
 */
export function createSynchronousModelRunner(model: RunnableModel): ModelRunner {
  // Maintain a `ReferencedRunModelParams` instance that holds the I/O parameters
  const params = new ReferencedRunModelParams()

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  const runModelSync = (inputs: (InputValue | number)[], outputs: Outputs, options: RunModelOptions | undefined) => {
    // Update the I/O parameters
    params.updateFromParams(inputs, outputs, options)

    // Run the model synchronously using those parameters
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

    terminate: async () => {
      if (!terminated) {
        model.terminate()
        terminated = true
      }
    }
  }
}
