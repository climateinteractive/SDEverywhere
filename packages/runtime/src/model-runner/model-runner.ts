// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { InputValue, Outputs } from '../_shared'
import type { RunModelOptions } from '../runnable-model'

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
   * @param options Additional options that influence the model run.
   * @return A promise that resolves with the outputs when the model run is complete.
   */
  runModel(inputs: number[] | InputValue[], outputs: Outputs, options?: RunModelOptions): Promise<Outputs>

  /**
   * Run the model synchronously.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   * @return The outputs of the run.
   *
   * @hidden This is only intended for internal use; some implementations may not support
   * running the model synchronously, in which case this will be undefined.
   */
  runModelSync?(inputs: number[] | InputValue[], outputs: Outputs, options?: RunModelOptions): Outputs

  /**
   * Terminate the runner by releasing underlying resources (e.g., the worker thread or
   * Wasm module/buffers).
   */
  terminate(): Promise<void>
}
