// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId, OutputVarSpec } from '../_shared'
import type { WasmBuffer } from './wasm-buffer'
import { createFloat64WasmBuffer, createInt32WasmBuffer } from './wasm-buffer'
import type { WasmModule } from './wasm-module'

// For each output variable specified in the indices buffer, there
// are 4 index values:
//   varIndex
//   subIndex0
//   subIndex1
//   subIndex2
// NOTE: This value needs to match `INDICES_PER_OUTPUT` as defined in SDE's `model.c`
const indicesPerOutput = 4

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
  /**
   * The maximum number of output indices that can be passed for each run.
   * @hidden This is not yet part of the public API; it is exposed here for use
   * in experimental testing tools.
   */
  public readonly maxOutputIndices: number

  private readonly wasmRunModel: (inputsAddress: number, outputsAddress: number, outputIndicesAddress: number) => void

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

    // Note that `getMaxOutputIndices` is not yet official, so proceed if it is not exposed
    try {
      this.maxOutputIndices = getNumberValue('getMaxOutputIndices')
    } catch (e) {
      this.maxOutputIndices = 0
    }

    // Each series will include one data point per "save", inclusive of the
    // start and end times
    this.numSavePoints = Math.round((this.endTime - this.startTime) / this.saveFreq) + 1

    this.wasmRunModel = wasmModule.cwrap('runModelWithBuffers', null, ['number', 'number', 'number'])
  }

  /**
   * Run the model, using inputs from the `inputs` buffer, and writing outputs into
   * the `outputs` buffer.
   *
   * @param inputs The buffer containing inputs in the order expected by the model.
   * @param outputs The buffer into which the model will store output values.
   * @param outputIndices The buffer used to control which variables are written to `outputs`.
   */
  runModel(
    inputs: WasmBuffer<Float64Array>,
    outputs: WasmBuffer<Float64Array>,
    outputIndices?: WasmBuffer<Int32Array>
  ): void {
    this.wasmRunModel(inputs.getAddress(), outputs.getAddress(), outputIndices?.getAddress() || 0)
  }
}

/**
 * The result of model initialization.
 */
export interface WasmModelInitResult {
  /** The wasm model. */
  model: WasmModel
  /** The buffer used to pass input values to the model. */
  inputsBuffer: WasmBuffer<Float64Array>
  /** The buffer used to receive output values from the model. */
  outputsBuffer: WasmBuffer<Float64Array>
  /**
   * The buffer used to control which variables are written to `outputsBuffer`.
   * @hidden This is not yet part of the public API; it is exposed here for use
   * in experimental testing tools.
   */
  outputIndicesBuffer?: WasmBuffer<Int32Array>
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
  const inputsBuffer = createFloat64WasmBuffer(wasmModule, numInputs)

  // Allocate a buffer that is large enough to hold the series data for each output variable
  const outputVarCount = Math.max(outputVarIds.length, model.maxOutputIndices)
  const outputsBuffer = createFloat64WasmBuffer(wasmModule, outputVarCount * model.numSavePoints)

  // Allocate a buffer for the output indices, if requested (for accessing internal variables)
  let outputIndicesBuffer: WasmBuffer<Int32Array>
  if (model.maxOutputIndices > 0) {
    outputIndicesBuffer = createInt32WasmBuffer(wasmModule, model.maxOutputIndices * indicesPerOutput)
  }

  return {
    model,
    inputsBuffer,
    outputsBuffer,
    outputIndicesBuffer,
    outputVarIds
  }
}

/**
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 */
export function updateOutputIndices(indicesArray: Int32Array, outputVarSpecs: OutputVarSpec[]): void {
  if (indicesArray.length < outputVarSpecs.length * indicesPerOutput) {
    throw new Error('Length of indicesArray must be large enough to accommodate the given outputVarSpecs')
  }

  // Write the indices to the buffer
  let offset = 0
  for (const outputVarSpec of outputVarSpecs) {
    const subCount = outputVarSpec.subscriptIndices?.length || 0
    indicesArray[offset + 0] = outputVarSpec.varIndex
    indicesArray[offset + 1] = subCount > 0 ? outputVarSpec.subscriptIndices[0] : 0
    indicesArray[offset + 2] = subCount > 1 ? outputVarSpec.subscriptIndices[1] : 0
    indicesArray[offset + 3] = subCount > 2 ? outputVarSpec.subscriptIndices[2] : 0
    offset += indicesPerOutput
  }

  // Fill the remainder of the buffer with zeros
  indicesArray.fill(0, offset)
}
