// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'
import { WasmBuffer } from './wasm-buffer'
import type { WasmModule } from './wasm-module'

/**
 * An interface to the generated WebAssembly model.  Allows for running the model with
 * a given set of input values, producing a set of output values.
 */
export class WasmModel {
  /** The start time for the model (aka `INITIAL TIME`). */
  public readonly startTime: number
  /** The end time for the model (aka `FINAL TIME`). */
  public readonly endTime: number
  /** The frequency with which output values are saved (aka `SAVEPER`). */
  public readonly saveFreq: number
  /** The number of save points for each output. */
  public readonly numSavePoints: number

  private readonly wasmRunModel: (inputsAddress: number, outputsAddress: number) => void

  /**
   * @param wasmModule The `WasmModule` that provides access to the native functions.
   */
  constructor(wasmModule: WasmModule) {
    function getNumberValue(funcName: string): number {
      const wasmGetValue: () => number = wasmModule.cwrap(funcName, 'number', [])
      return wasmGetValue()
    }
    this.startTime = getNumberValue('getInitialTime')
    this.endTime = getNumberValue('getFinalTime')
    this.saveFreq = getNumberValue('getSaveper')

    // Each series will include one data point per "save", inclusive of the
    // start and end times
    this.numSavePoints = Math.round((this.endTime - this.startTime) / this.saveFreq) + 1

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
}

/**
 * Initialize the wasm model and buffers.
 *
 * @param wasmModule The `WasmModule` that wraps the `wasm` binary.
 * @param numInputs The number of input variables, per the spec file passed to `sde`.
 * @param outputVarIds The output variable IDs, per the spec file passed to `sde`.
 */
export function initWasmModelAndBuffers(
  wasmModule: WasmModule,
  numInputs: number,
  outputVarIds: OutputVarId[]
): WasmModelInitResult {
  // Wrap the native C `runModelWithBuffers` function in a JS function that we can call
  const model = new WasmModel(wasmModule)

  // Allocate a buffer that is large enough to hold the input values
  const inputsBuffer = new WasmBuffer(wasmModule, numInputs)

  // Allocate a buffer that is large enough to hold the series data for
  // each output variable
  const outputsBuffer = new WasmBuffer(wasmModule, outputVarIds.length * model.numSavePoints)

  return {
    model,
    inputsBuffer,
    outputsBuffer,
    outputVarIds
  }
}
