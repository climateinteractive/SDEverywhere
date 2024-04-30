// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'
import type { RunnableModel } from '../runnable-model'
import { perfElapsed, perfNow } from '../perf'
import { createFloat64WasmBuffer, createInt32WasmBuffer, type WasmBuffer } from './wasm-buffer'
import type { WasmModule } from './wasm-module'

/**
 * An interface to the generated WebAssembly model.  Allows for running the model with
 * a given set of input values, producing a set of output values.
 *
 * @hidden This is not part of the public API; only the `RunnableModel` type is public.
 */
export class WasmModel implements RunnableModel {
  /** The start time for the model (aka `INITIAL TIME`). */
  public readonly startTime: number
  /** The end time for the model (aka `FINAL TIME`). */
  public readonly endTime: number
  /** The frequency with which output values are saved (aka `SAVEPER`). */
  public readonly saveFreq: number
  /** The number of save points for each output. */
  public readonly numSavePoints: number

  // Reuse the wasm buffers.  These buffers are allocated on demand and grown
  // (reallocated) as needed.  For each buffer, we keep a reference to the
  // `Array` view on that buffer.
  private inputsBuffer: WasmBuffer<Float64Array>
  private inputsArray: Float64Array
  private inputIndicesBuffer: WasmBuffer<Int32Array>
  private inputIndicesArray: Int32Array
  private outputsBuffer: WasmBuffer<Float64Array>
  private outputsArray: Float64Array
  private outputIndicesBuffer: WasmBuffer<Int32Array>
  private outputIndicesArray: Int32Array

  private readonly wasmRunModel: (
    inputsAddress: number,
    outputsAddress: number,
    inputIndicesAddress: number,
    outputIndicesAddress: number
  ) => void

  /**
   * @param wasmModule The `WasmModule` that provides access to the native functions.
   * @param outputVarIds The output variable IDs for this model.
   */
  constructor(private readonly wasmModule: WasmModule, public readonly outputVarIds: OutputVarId[]) {
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

    // Make the native `runModelWithBuffers` function callable
    this.wasmRunModel = wasmModule.cwrap('runModelWithBuffers', null, ['number', 'number', 'number', 'number'])
  }

  // from RunnableModel interface
  runModel(params: RunModelParams): void {
    // TODO: Ideally we would allocate a little extra space in all of the buffers below
    // to avoid constantly reallocating the buffers in the case where a small number of
    // additional inputs or outputs are needed for each run

    // Update the input indices, if needed
    // TODO: Throw an error if inputs.length is less than inputVarSpecs.length
    const inputVarSpecs = options?.inputVarSpecs
    let useInputIndices: boolean
    if (inputVarSpecs !== undefined && inputVarSpecs.length > 0) {
      // Allocate (or reallocate) the `WasmBuffer` into which the input indices will be copied
      const requiredInputIndicesLength = (inputVarSpecs.length + 1) * indicesPerVariable
      if (inputIndicesBuffer === undefined || inputIndicesBuffer.numElements < requiredInputIndicesLength) {
        inputIndicesBuffer?.dispose()
        inputIndicesBuffer = createInt32WasmBuffer(this.wasmModule, requiredInputIndicesLength)
        inputIndicesArray = inputIndicesBuffer.getArrayView()
      }
      updateVarIndices(inputIndicesArray, inputVarSpecs)
      useInputIndices = true
    } else {
      // Don't use the input indices buffer when input var specs are not provided
      useInputIndices = false
    }

    // Allocate (or reallocate) the `WasmBuffer` into which the inputs will be copied
    if (inputsBuffer === undefined || inputsBuffer.numElements < inputs.length) {
      inputsBuffer?.dispose()
      inputsBuffer = createFloat64WasmBuffer(this.wasmModule, inputs.length)
      inputsArray = inputsBuffer.getArrayView()
    }

    // Copy the input values into the `WasmBuffer`
    // TODO: Throw an error if inputs.length is less than number of inputs declared
    // in the spec (only in the case where useInputIndices is false)
    for (let i = 0; i < inputs.length; i++) {
      // XXX: The `inputs` array type used to be declared as `InputValue[]`, so some users
      // may be relying on that, but it has now been simplified to `number[]`.  For the time
      // being, we will allow for either type and choose which one depending on the shape of
      // the array elements.
      const input = inputs[i]
      if (typeof input === 'number') {
        inputsArray[i] = input
      } else {
        inputsArray[i] = input.get()
      }
    }

    // Update the output indices, if needed
    const outputVarSpecs = outputs.varSpecs
    let useOutputIndices: boolean
    let outputVarCount: number
    if (outputVarSpecs !== undefined && outputVarSpecs.length > 0) {
      // The output indices buffer needs to include N elements for each var spec plus one
      // additional "zero" element as a terminator
      const requiredOutputIndicesLength = (outputVarSpecs.length + 1) * indicesPerVariable
      // Allocate (or reallocate) the `WasmBuffer` into which the input indices will be copied
      if (outputIndicesBuffer === undefined || outputIndicesBuffer.numElements < requiredOutputIndicesLength) {
        outputIndicesBuffer?.dispose()
        outputIndicesBuffer = createInt32WasmBuffer(this.wasmModule, outputVarSpecs.length)
        outputIndicesArray = outputIndicesBuffer.getArrayView()
      }
      updateVarIndices(outputIndicesArray, outputVarSpecs)
      useOutputIndices = true
      outputVarCount = outputVarSpecs.length
    } else {
      // Don't use the output indices buffer when output var specs are not provided
      useOutputIndices = false
      outputVarCount = wasmResult.outputVarIds.length
    }

    // Allocate (or reallocate) the `WasmBuffer` into which the outputs will be copied
    const requiredOutputsLength = outputVarCount * wasmModel.numSavePoints
    if (outputsBuffer === undefined || outputsBuffer.numElements < requiredOutputsLength) {
      outputsBuffer?.dispose()
      outputsBuffer = createFloat64WasmBuffer(this.wasmModule, requiredOutputsLength)
      outputsArray = outputsBuffer.getArrayView()
    }

    // Run the model
    const t0 = perfNow()
    this.wasmRunModel(
      this.inputsBuffer.getAddress(),
      this.outputsBuffer.getAddress(),
      this.inputIndicesBuffer?.getAddress() || 0,
      this.outputIndicesBuffer?.getAddress() || 0
    )

    // TODO: Capture the elapsed time
    // outputs.runTimeInMillis = perfElapsed(t0)

    // // Capture the outputs array by copying the data into the given `Outputs`
    // // data structure
    // outputs.updateFromBuffer(outputsArray, rowLength)
  }
}

/**
 * Initialize the wasm model.
 *
 * @param wasmModule The `WasmModule` that wraps the `wasm` binary.
 * @param outputVarIds The output variable IDs, per the spec file passed to `sde`.
 * @return The initialized `WasmModel` instance.
 */
export function initWasmModel(wasmModule: WasmModule, outputVarIds: OutputVarId[]): RunnableModel {
  return new WasmModel(wasmModule, outputVarIds)
}
