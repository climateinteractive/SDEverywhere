// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { WasmModelInitResult } from '../wasm-model'
import type { InputValue } from './inputs'
import type { Outputs } from './outputs'
import { perfElapsed, perfNow } from './perf'

/**
 * Abstraction that allows for running the wasm model on the JS thread
 * or asynchronously (e.g. in a Web Worker), depending on the implementation.
 */
export interface ModelRunner {
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
  const rowLength = wasmResult.endTime - wasmResult.startTime + 1

  // Disallow `runModel` after the runner has been terminated
  let terminated = false

  const runModelSync = (inputs: InputValue[], outputs: Outputs) => {
    // Capture the current set of input values into the reusable buffer
    let i = 0
    for (const input of inputs) {
      inputsArray[i++] = input.get()
    }

    // Run the model
    const t0 = perfNow()
    wasmModel.runModel(inputsBuffer, outputsBuffer)
    outputs.runTimeInMillis = perfElapsed(t0)

    // Capture the outputs array by copying the data into the given `Outputs`
    // data structure
    outputs.updateFromBuffer(outputsArray, rowLength)

    return outputs
  }

  return {
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
