// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { indicesPerVariable, type VarSpec } from '../_shared'
import type { RunnableModel } from '../runnable-model'
import { BaseRunnableModel } from '../runnable-model/base-runnable-model'

import { getJsModelFunctions, type JsModelFunctionContext, type JsModelFunctions } from './js-model-functions'

/**
 * An interface that exposes the functions of a JavaScript model generated by the
 * SDEverywhere transpiler.  This allows for running the model with a given set of
 * input values, which will produce a set of output values.
 *
 * This is a low-level interface that most developers will not need to interact
 * with directly.  Developers should instead use the `ModelRunner` interface to
 * interact with a generated model.  Use `createSynchronousModelRunner` to create
 * a synchronous `ModelRunner`, or `spawnAsyncModelRunner` to create an asynchronous
 * `ModelRunner`.
 *
 * @beta NOTE: The properties and methods exposed in this interface are meant for
 * internal use only, and are subject to change in coordination with the code
 * generated by the `@sdeverywhere/compile` package.
 */
export interface JsModel {
  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveFreq(): number

  /** @hidden */
  getModelFunctions(): JsModelFunctions
  /** @hidden */
  setModelFunctions(functions: JsModelFunctions): void

  setTime(time: number): void
  setInputs(inputValue: (index: number) => number): void

  getOutputVarIds(): string[]
  getOutputVarNames(): string[]
  storeOutputs(storeValue: (value: number) => void): void
  /** @hidden */
  storeOutput(varSpec: VarSpec, storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}

/**
 * Create a `RunnableModel` from a given `JsModel` that was generated by the
 * SDEverywhere transpiler.
 *
 * @hidden This is not part of the public API; only the top-level `createRunnableModel`
 * function is exposed in the public API.
 */
export function initJsModel(model: JsModel): RunnableModel {
  // Install the default implementation of model functions if not already provided
  let fns = model.getModelFunctions()
  if (fns === undefined) {
    fns = getJsModelFunctions()
    model.setModelFunctions(fns)
  }

  // Get the control variable values.  Once the first 4 control variables are known,
  // we can compute `numSavePoints` here.
  const initialTime = model.getInitialTime()
  const finalTime = model.getFinalTime()
  const timeStep = model.getTimeStep()
  const saveFreq = model.getSaveFreq()
  const numSavePoints = Math.round((finalTime - initialTime) / saveFreq) + 1

  return new BaseRunnableModel({
    startTime: initialTime,
    endTime: finalTime,
    saveFreq: saveFreq,
    numSavePoints,
    outputVarIds: model.getOutputVarIds(),
    onRunModel: (inputs, outputs, outputIndices) => {
      runJsModel(model, initialTime, finalTime, timeStep, saveFreq, numSavePoints, inputs, outputs, outputIndices)
    }
  })
}

function runJsModel(
  model: JsModel,
  initialTime: number,
  finalTime: number,
  timeStep: number,
  saveFreq: number,
  numSavePoints: number,
  inputs: Float64Array,
  outputs: Float64Array,
  outputIndices: Int32Array | undefined
): void {
  // Initialize time with the required `INITIAL TIME` control variable
  let time = initialTime
  model.setTime(time)

  // Configure the functions.  The function context makes the control variable values
  // available to certain functions that depend on those values.
  const fnContext: JsModelFunctionContext = {
    initialTime,
    finalTime,
    timeStep,
    currentTime: time
  }
  model.getModelFunctions().setContext(fnContext)

  // Initialize constants to their default values
  model.initConstants()

  if (inputs.length > 0) {
    // Set the user-defined input values.  This needs to happen after `initConstants`
    // since the input values will override the default constant values.
    model.setInputs(index => inputs[index])
  }

  // Initialize level variables
  model.initLevels()

  // Set up a run loop using a fixed number of time steps
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  let savePointIndex = 0
  let outputVarIndex = 0
  while (step <= lastStep) {
    // Evaluate aux variables
    model.evalAux()

    if (time % saveFreq < 1e-6) {
      outputVarIndex = 0
      const storeValue = (value: number) => {
        // Write each value into the preallocated buffer; each variable has a "row" that
        // contains `numSavePoints` values, one value for each save point
        const outputBufferIndex = outputVarIndex * numSavePoints + savePointIndex
        outputs[outputBufferIndex] = value
        outputVarIndex++
      }
      if (outputIndices !== undefined) {
        // Store the outputs as specified in the current output indices buffer.  This
        // iterates over the output indices buffer until we reach the first zero index.
        let i = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const indexBufferOffset = i * indicesPerVariable
          const varIndex = outputIndices[indexBufferOffset]
          if (varIndex > 0) {
            const subscriptIndices: number[] = Array(3)
            subscriptIndices[0] = outputIndices[indexBufferOffset + 1]
            subscriptIndices[1] = outputIndices[indexBufferOffset + 2]
            subscriptIndices[2] = outputIndices[indexBufferOffset + 3]
            const varSpec: VarSpec = {
              varIndex,
              subscriptIndices
            }
            model.storeOutput(varSpec, storeValue)
          } else {
            // Stop when we reach the first zero index
            break
          }
          i++
        }
      } else {
        // Store the normal outputs
        // TODO: In the case of a synchronous `ModelRunner`, we can access the `Outputs`
        // instance directly and write directly into that instead of into a typed array.
        // We can update `BaseRunnableModel` to expose the `Outputs` instance, and if it
        // is defined, we can use the following code to write into the `Outputs`.
        // if (outputsInstance) {
        //   model.storeOutputs(value => {
        //     // Write each value into the preallocated buffer; each variable has a "row" that
        //     // contains `numSavePoints` values, one value for each save point
        //     const series = outputsInstance.varSeries[outputVarIndex]
        //     series.points[savePointIndex].y = value
        //     outputVarIndex++
        //   })
        // } else {
        model.storeOutputs(storeValue)
        // }
      }
      savePointIndex++
    }

    if (step === lastStep) {
      // This is the last step, so we are done
      break
    }

    // Propagate levels for the next time step
    model.evalLevels()

    // Advance time by one step
    time += timeStep
    model.setTime(time)
    fnContext.currentTime = time
    step++
  }
}
