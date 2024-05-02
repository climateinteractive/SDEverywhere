// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { type InputValue, Outputs } from '../_shared'
import { ReferencedRunModelParams } from '../runnable-model'
import type { RunnableModel } from '../runnable-model'
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

  const runModelSync = (inputs: (InputValue | number)[], outputs: Outputs) => {
    // Update the I/O parameters
    params.updateFromParams(inputs, outputs)

    // Run the model synchronously using those parameters
    model.runModel(params)

    // If `getOutputs` returns undefined, it means that the model already wrote
    // directly into the `Outputs` instance, so it is already updated.  If it
    // returns an array, then we need to copy the output values from that array
    // into the provided `Outputs` instance.
    // const outputsArray = params.getOutputs()
    // if (outputsArray !== undefined) {
    // const result = outputs.updateFromBuffer(outputsArray, model.numSavePoints)
    // if (result.isErr()) {
    //   throw new Error(`Failed to store outputs: ${result.error}`)
    // }
    // }

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
