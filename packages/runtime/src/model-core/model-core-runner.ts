// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { InputValue } from '../model-runner/inputs'
import type { ModelRunner } from '../model-runner/model-runner'
import { Outputs } from '../model-runner/outputs'

import type { ModelCore } from './model-core'

/**
 * Create a `ModelRunner` that runs the given `ModelCore` on the JS thread.
 *
 * @param modelCore A `ModelCore` instance.
 */
export function createCoreRunner(modelCore: ModelCore): ModelRunner {
  let terminated = false

  return {
    createOutputs(): Outputs {
      // return new Outputs(wasmResult.outputVarIds, wasmModel.startTime, wasmModel.endTime, wasmModel.saveFreq)
      return new Outputs()
    },

    async runModel(inputs: InputValue[], outputs: Outputs): Promise<Outputs> {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      runModelSync(inputs, outputs)
      return outputs
    },

    runModelSync(inputs: InputValue[], outputs: Outputs): Outputs {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      runModelSync(inputs, outputs)
      return outputs
    },

    async terminate(): Promise<void> {
      if (!terminated) {
        // TODO: Release resources (buffers, etc)
        terminated = true
      }
    }
  }
}

function runModelSync(core: ModelCore, inputs: number[], outputs: number[]) {
  // TODO
  const useOutputIndices = false

  // Initialize constants (including control variables)
  core.initConstants()

  // Get the control variable values
  const finalTime = core.getFinalTime()
  const initialTime = core.getInitialTime()
  const timeStep = core.getTimeStep()

  // Initialize time with the required `INITIAL TIME` control variable
  let time = initialTime
  core.setTime(time)

  // These values will be initialized after the first call to `evalAux` (see
  // note in main loop below)
  let saveStep: number
  let numSavePoints: number

  // Set the user-defined input values.  This needs to happen after `initConstants`
  // since the input values will override the default constant values.
  core.setInputs(inputs)

  // Initialize level variables
  core.initLevels()

  // Set up a run loop using a fixed number of time steps
  let savePointIndex = 0
  // let outputIndex = 0
  let outputVarIndex = 0
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  while (step <= lastStep) {
    // Evaluate aux variables
    core.evalAux()

    if (saveStep === undefined) {
      // Note that many Vensim models set `SAVEPER = TIME STEP`, in which case SDE
      // treats `SAVEPER` as an aux rather than a constant.  Therefore, we need to
      // initialize `numSavePoints` here, after the first `evalAux` call, to be
      // certain that `_saveper` has been initialized before it is used.
      saveStep = core.getSaveStep()
      numSavePoints = Math.round((finalTime - initialTime) / saveStep) + 1
    }

    if (time % saveStep < 1e-6) {
      outputVarIndex = 0
      if (useOutputIndices) {
        //         // Store the outputs as specified in the current output index buffer
        //         for (size_t i = 0; i < maxOutputIndices; i++) {
        //           size_t indexBufferOffset = i * INDICES_PER_OUTPUT;
        //           size_t varIndex = (size_t)outputIndexBuffer[indexBufferOffset];
        //           if (varIndex > 0) {
        //             size_t subIndex0 = (size_t)outputIndexBuffer[indexBufferOffset + 1];
        //             size_t subIndex1 = (size_t)outputIndexBuffer[indexBufferOffset + 2];
        //             size_t subIndex2 = (size_t)outputIndexBuffer[indexBufferOffset + 3];
        //             storeOutput(varIndex, subIndex0, subIndex1, subIndex2);
        //           } else {
        //             // Stop when we reach the first zero index
        //             break;
        //           }
        //         }
      } else {
        // Store the normal outputs
        core.storeOutputs(outputs, value => {
          // Write each value into the preallocated buffer; each variable has a "row" that
          // contains `numSavePoints` values, one value for each save point
          const outputBufferIndex = outputVarIndex * numSavePoints + savePointIndex
          outputs[outputBufferIndex] = value
          outputVarIndex++
        })
      }
      savePointIndex++
    }

    if (step == lastStep) {
      // This is the last step, so we are done
      break
    }

    // Propagate levels for the next time step
    core.evalLevels()

    // Advance time by one step
    time += timeStep
    core.setTime(time)
    step++
  }
}
