// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { InputValue } from '../model-runner/inputs'
import type { ModelRunner } from '../model-runner/model-runner'
import { Outputs } from '../model-runner/outputs'
import { perfElapsed, perfNow } from '../model-runner/perf'

import { getCoreFunctions, type CoreFunctionContext, type CoreFunctions } from './core-functions'
import type { ModelCore } from './model-core'

/**
 * Create a `ModelRunner` that runs the given `ModelCore` on the JS thread.
 *
 * @param core A `ModelCore` instance.
 */
export function createCoreRunner(core: ModelCore): ModelRunner {
  // Track whether the runner has been terminated
  let terminated = false

  return {
    createOutputs(): Outputs {
      return createOutputsForCore(core)
    },

    async runModel(inputs: InputValue[], outputs: Outputs): Promise<Outputs> {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      runModelCore(core, inputs, outputs)
      return outputs
    },

    runModelSync(inputs: InputValue[], outputs: Outputs): Outputs {
      if (terminated) {
        throw new Error('Model runner has already been terminated')
      }
      runModelCore(core, inputs, outputs)
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

/**
 * Run the given `ModelCore` synchronously using the provided inputs and store the output values in
 * the given `Outputs` instance.
 *
 * @param core A `ModelCore` instance.
 * @param inputs The model input values (must be in the same order as in the spec file).
 * @param outputs The structure into which the model outputs will be stored.
 * @return The outputs of the run.
 */
export function runModelCore(core: ModelCore, inputs?: InputValue[], outputs?: Outputs): Outputs {
  // TODO
  const useOutputIndices = false

  // Install the default implementation of model functions if not already provided
  let fns: CoreFunctions
  if (core.getModelFunctions() === undefined) {
    fns = getCoreFunctions()
    core.setModelFunctions(fns)
  }

  // Get the control variable values.  Note that this step will cause `initConstants`
  // to be called to ensure that the control parameters are initialized, so we don't
  // need to call `initConstants` again before running the model.
  const finalTime = core.getFinalTime()
  const initialTime = core.getInitialTime()
  const timeStep = core.getTimeStep()
  const saveFreq = core.getSaveFreq()

  // Initialize time with the required `INITIAL TIME` control variable
  let time = initialTime
  core.setTime(time)

  // Configure the functions.  The function context makes the control variable values
  // available to certain functions that depend on those values.
  const fnContext: CoreFunctionContext = {
    initialTime,
    finalTime,
    timeStep,
    currentTime: time
  }
  fns.setContext(fnContext)

  if (inputs) {
    // Set the user-defined input values.  This needs to happen after `initConstants`
    // since the input values will override the default constant values.
    core.setInputs(index => inputs[index].get())
  }

  // Create an `Outputs` instance if one was not provided
  if (outputs === undefined) {
    outputs = createOutputsForCore(core)
  }

  // Initialize level variables
  core.initLevels()

  // Capture the start time
  const t0 = perfNow()

  // Set up a run loop using a fixed number of time steps
  let savePointIndex = 0
  // let outputIndex = 0
  let outputVarIndex = 0
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  while (step <= lastStep) {
    // Evaluate aux variables
    core.evalAux()

    if (time % saveFreq < 1e-6) {
      outputVarIndex = 0
      if (useOutputIndices) {
        // // Store the outputs as specified in the current output index buffer
        // for (size_t i = 0; i < maxOutputIndices; i++) {
        //   size_t indexBufferOffset = i * INDICES_PER_OUTPUT;
        //   size_t varIndex = (size_t)outputIndexBuffer[indexBufferOffset];
        //   if (varIndex > 0) {
        //     size_t subIndex0 = (size_t)outputIndexBuffer[indexBufferOffset + 1];
        //     size_t subIndex1 = (size_t)outputIndexBuffer[indexBufferOffset + 2];
        //     size_t subIndex2 = (size_t)outputIndexBuffer[indexBufferOffset + 3];
        //     storeOutput(varIndex, subIndex0, subIndex1, subIndex2);
        //   } else {
        //     // Stop when we reach the first zero index
        //     break;
        //   }
        // }
      } else {
        // Store the normal outputs
        core.storeOutputs(value => {
          // Write each value into the preallocated buffer; each variable has a "row" that
          // contains `numSavePoints` values, one value for each save point
          const series = outputs.varSeries[outputVarIndex]
          series.points[savePointIndex].y = value
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
    fnContext.currentTime = time
    step++
  }

  // Store the elapsed time
  outputs.runTimeInMillis = perfElapsed(t0)

  return outputs
}

function createOutputsForCore(core: ModelCore): Outputs {
  const outputVarIds = core.getOutputVarIds()
  const initialTime = core.getInitialTime()
  const finalTime = core.getFinalTime()
  const saveFreq = core.getSaveFreq()
  return new Outputs(outputVarIds, initialTime, finalTime, saveFreq)
}
