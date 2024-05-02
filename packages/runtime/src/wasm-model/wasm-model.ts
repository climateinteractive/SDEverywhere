// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'
import type { RunModelParams, RunnableModel } from '../runnable-model'
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
  // (reallocated) as needed.
  private inputsBuffer: WasmBuffer<Float64Array>
  private outputsBuffer: WasmBuffer<Float64Array>
  private outputIndicesBuffer: WasmBuffer<Int32Array>

  private readonly wasmRunModel: (inputsAddress: number, outputsAddress: number, outputIndicesAddress: number) => void

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
    this.wasmRunModel = wasmModule.cwrap('runModelWithBuffers', null, ['number', 'number', 'number'])
  }

  // from RunnableModel interface
  runModel(params: RunModelParams): void {
    // Note that for wasm models, we always need to allocate `WasmBuffer` instances to
    // and copy data to/from them because only that kind of buffer can be passed to
    // the `wasmRunModel` function.

    // Copy the inputs to the `WasmBuffer`.  If we don't have an existing `WasmBuffer`,
    // or the existing one is not big enough, the callback will allocate a new one.
    params.copyInputs(this.inputsBuffer?.getArrayView(), numElements => {
      this.inputsBuffer?.dispose()
      this.inputsBuffer = createFloat64WasmBuffer(this.wasmModule, numElements)
      return this.inputsBuffer.getArrayView()
    })

    let outputIndicesBuffer: WasmBuffer<Int32Array>
    if (params.getOutputIndicesLength() > 0) {
      // Copy the output indices (if needed) to the `WasmBuffer`.  If we don't have an
      // existing `WasmBuffer`, or the existing one is not big enough, the callback
      // will allocate a new one.
      params.copyOutputIndices(this.outputIndicesBuffer?.getArrayView(), numElements => {
        this.outputIndicesBuffer?.dispose()
        this.outputIndicesBuffer = createInt32WasmBuffer(this.wasmModule, numElements)
        return this.outputIndicesBuffer.getArrayView()
      })
      outputIndicesBuffer = this.outputIndicesBuffer
    } else {
      // The output indices are not active
      outputIndicesBuffer = undefined
    }

    // Allocate (or reallocate) the `WasmBuffer` that will receive the outputs
    const outputsLengthInElements = params.getOutputsLength()
    if (this.outputsBuffer === undefined || this.outputsBuffer.numElements < outputsLengthInElements) {
      this.outputsBuffer?.dispose()
      this.outputsBuffer = createFloat64WasmBuffer(this.wasmModule, outputsLengthInElements)
    }

    // Run the model
    const t0 = perfNow()
    this.wasmRunModel(
      this.inputsBuffer.getAddress(),
      this.outputsBuffer.getAddress(),
      outputIndicesBuffer?.getAddress() || 0
    )
    const elapsed = perfElapsed(t0)

    // Copy the outputs that were stored into the `WasmBuffer` back to the `RunModelParams`
    params.storeOutputs(this.outputsBuffer.getArrayView())

    // Store the elapsed time in the `RunModelParams`
    params.storeElapsedTime(elapsed)
  }

  // from RunnableModel interface
  terminate(): void {
    this.inputsBuffer?.dispose()
    this.inputsBuffer = undefined

    this.outputsBuffer?.dispose()
    this.outputsBuffer = undefined

    this.outputIndicesBuffer?.dispose()
    this.outputIndicesBuffer = undefined

    // TODO: Dispose the `WasmModule` too?
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
