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
  /** The buffer used to control which variables are written to `outputsBuffer`. */
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
 * @param useOutputIndices Whether to initialize the `outputIndicesBuffer`.
 */
export function initWasmModelAndBuffers(
  wasmModule: WasmModule,
  numInputs: number,
  outputVarIds: OutputVarId[],
  useOutputIndices = false
): WasmModelInitResult {
  // Wrap the native C `runModelWithBuffers` function in a JS function that we can call
  const model = new WasmModel(wasmModule)

  // Allocate a buffer that is large enough to hold the input values
  const inputsBuffer = createFloat64WasmBuffer(wasmModule, numInputs)

  // Allocate a buffer that is large enough to hold the series data for
  // each output variable
  const outputsBuffer = createFloat64WasmBuffer(wasmModule, outputVarIds.length * model.numSavePoints)

  // Allocate a buffer for the output indices, if requested
  let outputIndicesBuffer: WasmBuffer<Int32Array>
  if (useOutputIndices) {
    outputIndicesBuffer = createInt32WasmBuffer(wasmModule, outputVarIds.length * indicesPerOutput)
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
  for (let j = 0; j < indicesArray.length; j++) {
    const offset = j * indicesPerOutput
    if (j < outputVarSpecs.length) {
      // Write the indices to the buffer
      const outputVarSpec = outputVarSpecs[j]
      const subCount = outputVarSpec.subscriptIndices?.length || 0
      indicesArray[offset + 0] = outputVarSpec.varIndex
      indicesArray[offset + 1] = subCount > 0 ? outputVarSpec.subscriptIndices[0] : 0
      indicesArray[offset + 2] = subCount > 1 ? outputVarSpec.subscriptIndices[1] : 0
      indicesArray[offset + 3] = subCount > 2 ? outputVarSpec.subscriptIndices[2] : 0
    } else {
      // Using zero makes SDE skip this position
      indicesArray[offset] = 0
    }
  }
}
