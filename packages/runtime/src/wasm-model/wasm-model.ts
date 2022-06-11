// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'
import { WasmBuffer } from './wasm-buffer'
import type { WasmModule } from './wasm-module'

/**
 * An interface to the En-ROADS model.  Allows for running the model with
 * a given set of input values, producing a set of output values.
 */
export class WasmModel {
  private readonly wasmRunModel: (inputsAddress: number, outputsAddress: number) => void

  /**
   * @param wasmModule The `WasmModule` containing the `runModelWithBuffers` function.
   */
  constructor(wasmModule: WasmModule) {
    this.wasmRunModel = wasmModule.cwrap('runModelWithBuffers', null, ['number', 'number'])
  }

  /**
   * Run the model, using inputs from the `inputs` buffer, and writing outputs into
   * the `outputs` buffer.
   *
   * @param inputs The buffer containing inputs in the order expected by the model.
   * @param outputs The buffer into which the model will store output values.
   */
  runModel(inputs: WasmBuffer, outputs: WasmBuffer): void {
    this.wasmRunModel(inputs.getAddress(), outputs.getAddress())
  }
}

/**
 * The result of model initialization.
 */
export interface WasmModelInitResult {
  /** The wasm model. */
  model: WasmModel
  /** The buffer used to pass input values to the model. */
  inputsBuffer: WasmBuffer
  /** The buffer used to receive output values from the model. */
  outputsBuffer: WasmBuffer
  /** The output variable IDs. */
  outputVarIds: OutputVarId[]
  /** The start time (year) for the model. */
  startTime: number
  /** The end time (year) for the model. */
  endTime: number
}

/**
 * Initialize the wasm model and buffers.
 *
 * @param wasmModule The `WasmModule` that wraps the `wasm` binary.
 * @param numInputs The number of input variables, per the spec file passed to `sde`.
 * @param outputVarIds The output variable IDs, per the spec file passed to `sde`.
 * @param startTime The start time (year) for the model.
 * @param endTime The end time (year) for the model.
 */
export function initWasmModelAndBuffers(
  wasmModule: WasmModule,
  numInputs: number,
  outputVarIds: OutputVarId[],
  startTime: number,
  endTime: number
): WasmModelInitResult {
  // Wrap the native C `runModelWithBuffers` function in a JS function that we can call
  const model = new WasmModel(wasmModule)

  // Allocate a buffer that is large enough to hold the input values
  const inputsBuffer = new WasmBuffer(wasmModule, numInputs)

  // Each series will include one data point per year, inclusive of the
  // start and end years
  // TODO: We should pull these from the C variables instead of having them passed in;
  // for now we assume `_saveper` is 1 but that should be pulled from the C variable too
  const seriesLength = endTime - startTime + 1

  // Allocate a buffer that is large enough to hold the series data for
  // each output variable
  const outputsBuffer = new WasmBuffer(wasmModule, outputVarIds.length * seriesLength)

  return {
    model,
    inputsBuffer,
    outputsBuffer,
    outputVarIds,
    startTime,
    endTime
  }
}
