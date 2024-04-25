// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { InputValue } from '../_shared'
import { Outputs, updateVarIndices } from '../_shared'

import type { WasmModelInitResult } from '../wasm-model'

import { perfElapsed, perfNow } from './perf'

/** TODO */
export interface RunModelOptions {
  /** TODO */
  inputIndices?: Int32Array
}

/**
 * Abstraction that allows for running the wasm model on the JS thread
 * or asynchronously (e.g. in a Web Worker), depending on the implementation.
 */
export interface ModelRunner {
  /**
   * Create an `Outputs` instance that is sized to accommodate the output variable
   * data stored by the model.
   *
   * @return A new `Outputs` instance.
   */
  createOutputs(): Outputs

  /**
   * Run the model.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @return A promise that resolves with the outputs when the model run is complete.
   */
  runModel(inputs: InputValue[], outputs: Outputs): Promise<Outputs>

  /**
   * Run the model synchronously.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @return The outputs of the run.
   *
   * @hidden This is only intended for internal use; some implementations may not support
   * running the model synchronously, in which case this will be undefined.
   */
  runModelSync?(inputs: InputValue[], outputs: Outputs): Outputs

  /**
   * Terminate the runner by releasing underlying resources (e.g., the worker thread or
   * Wasm module/buffers).
   */
  terminate(): Promise<void>
}

/**
 * Create a `ModelRunner` that runs the given wasm model on the JS thread.
 *
 * @param wasmResult The result of initializing the wasm model.
 */
export function createWasmModelRunner(wasmResult: WasmModelInitResult): ModelRunner {
  // Create views on the wasm buffers
  const wasmModel = wasmResult.model
  const inputsBuffer = wasmResult.inputsBuffer
  const inputsArray = inputsBuffer.getArrayView()
  const outputsBuffer = wasmResult.outputsBuffer
  const outputsArray = outputsBuffer.getArrayView()
  const outputIndicesBuffer = wasmResult.outputIndicesBuffer
  const outputIndicesArray = outputIndicesBuffer?.getArrayView()
  const rowLength = wasmModel.numSavePoints

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  const runModelSync = (inputs: InputValue[], outputs: Outputs) => {
    // Capture the current set of input values into the reusable buffer
    let i = 0
    for (const input of inputs) {
      inputsArray[i++] = input.get()
    }

    // Update the output indices, if needed
    const outputSpecs = outputs.varSpecs
    let useIndices: boolean
    if (outputIndicesArray && outputSpecs !== undefined && outputSpecs.length > 0) {
      updateVarIndices(outputIndicesArray, outputSpecs)
      useIndices = true
    } else {
      useIndices = false
    }

    // Run the model
    const t0 = perfNow()
    wasmModel.runModel(inputsBuffer, outputsBuffer, useIndices ? outputIndicesBuffer : undefined)
    outputs.runTimeInMillis = perfElapsed(t0)

    // Capture the outputs array by copying the data into the given `Outputs`
    // data structure
    outputs.updateFromBuffer(outputsArray, rowLength)

    return outputs
  }

  return {
    createOutputs: () => {
      return new Outputs(wasmResult.outputVarIds, wasmModel.startTime, wasmModel.endTime, wasmModel.saveFreq)
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

    terminate: () => {
      if (!terminated) {
        // TODO: Release wasm-related resources (module or buffers)
        terminated = true
      }
      return Promise.resolve()
    }
  }
}
