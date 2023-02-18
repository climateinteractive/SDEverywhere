// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { TransferDescriptor } from 'threads'
import { expose, Transfer } from 'threads/worker'

import type { WasmBuffer, WasmModel, WasmModelInitResult } from '@sdeverywhere/runtime'
import { perfElapsed, perfNow } from '@sdeverywhere/runtime'

/** @hidden */
let initWasmModel: () => Promise<WasmModelInitResult>
/** @hidden */
let wasmModel: WasmModel
/** @hidden */
let inputsWasmBuffer: WasmBuffer<Float64Array>
/** @hidden */
let outputsWasmBuffer: WasmBuffer<Float64Array>
/** @hidden */
let outputIndicesWasmBuffer: WasmBuffer<Int32Array>

interface InitResult {
  outputVarIds: string[]
  startTime: number
  endTime: number
  saveFreq: number
  inputsLength: number
  outputsLength: number
  outputIndicesLength: number
  outputRowLength: number
  ioBuffer: ArrayBuffer
}

/** @hidden */
const modelWorker = {
  async initModel(): Promise<TransferDescriptor<InitResult>> {
    if (wasmModel) {
      throw new Error('WasmModel was already initialized')
    }

    // Initialize the wasm model and associated buffers
    const wasmResult = await initWasmModel()

    // Capture the `WasmModel` instance and `WasmBuffer` instances
    wasmModel = wasmResult.model
    inputsWasmBuffer = wasmResult.inputsBuffer
    outputsWasmBuffer = wasmResult.outputsBuffer
    outputIndicesWasmBuffer = wasmResult.outputIndicesBuffer

    // Create a combined array that will hold a copy of the inputs and outputs
    // wasm buffers; this buffer is no-copy transferable, whereas the wasm ones
    // are not allowed to be transferred
    const runTimeLength = 8
    const inputsLength = inputsWasmBuffer.getArrayView().length
    const outputsLength = outputsWasmBuffer.getArrayView().length
    const outputIndicesLength = outputIndicesWasmBuffer?.getArrayView().length || 0
    const totalLength = runTimeLength + inputsLength + outputsLength + outputIndicesLength
    const ioArray = new Float64Array(totalLength)

    // Transfer the underlying buffer to the runner
    const ioBuffer = ioArray.buffer
    const initResult: InitResult = {
      outputVarIds: wasmResult.outputVarIds,
      startTime: wasmModel.startTime,
      endTime: wasmModel.endTime,
      saveFreq: wasmModel.saveFreq,
      inputsLength,
      outputsLength,
      outputIndicesLength,
      outputRowLength: wasmModel.numSavePoints,
      ioBuffer
    }
    return Transfer(initResult, [ioBuffer])
  },

  runModel(ioBuffer: ArrayBuffer): TransferDescriptor<ArrayBuffer> {
    if (!wasmModel) {
      throw new Error('WasmModel must be initialized before running the model in worker')
    }

    // The run time is stored in the first 8 bytes
    const runTimeOffsetInBytes = 0
    const runTimeLengthInElements = 1
    const runTimeLengthInBytes = runTimeLengthInElements * 8

    // Copy the inputs into the wasm inputs buffer
    const inputsWasmArray = inputsWasmBuffer.getArrayView()
    const inputsOffsetInBytes = runTimeOffsetInBytes + runTimeLengthInBytes
    const inputsLengthInElements = inputsWasmArray.length
    const inputsLengthInBytes = inputsWasmArray.byteLength
    const inputsBufferArray = new Float64Array(ioBuffer, inputsOffsetInBytes, inputsLengthInElements)
    inputsWasmArray.set(inputsBufferArray)

    // Copy the output indices into the wasm buffer, if needed
    const outputsWasmArray = outputsWasmBuffer.getArrayView()
    const outputsOffsetInBytes = runTimeLengthInBytes + inputsLengthInBytes
    const outputsLengthInBytes = outputsWasmArray.byteLength
    let useIndices = false
    if (outputIndicesWasmBuffer) {
      const indicesWasmArray = outputIndicesWasmBuffer.getArrayView()
      const indicesLengthInElements = indicesWasmArray.length
      const indicesOffsetInBytes = outputsOffsetInBytes + outputsLengthInBytes
      const indicesBufferArray = new Int32Array(ioBuffer, indicesOffsetInBytes, indicesLengthInElements)
      indicesWasmArray.set(indicesBufferArray)
      useIndices = true
    }

    // Run the model using the wasm buffers
    const t0 = perfNow()
    wasmModel.runModel(inputsWasmBuffer, outputsWasmBuffer, useIndices ? outputIndicesWasmBuffer : undefined)
    const elapsed = perfElapsed(t0)

    // Write the model run time to the buffer
    const runTimeBufferArray = new Float64Array(ioBuffer, runTimeOffsetInBytes, runTimeLengthInElements)
    runTimeBufferArray[0] = elapsed

    // Copy the outputs from the wasm outputs buffer
    const outputsLengthInElements = outputsWasmArray.length
    const outputsBufferArray = new Float64Array(ioBuffer, outputsOffsetInBytes, outputsLengthInElements)
    outputsBufferArray.set(outputsWasmArray)

    // Transfer the buffer back to the runner
    return Transfer(ioBuffer)
  }
}

/**
 * Expose an object in the current worker thread that communicates with the
 * `ModelRunner` instance running in the main thread.  The exposed worker
 * object will take care of running the `WasmModel` on the worker thread
 * and sending the outputs back to the main process.
 *
 * @param init The function that initializes the `WasmModel` instance that
 * is used in the worker thread.
 */
export function exposeModelWorker(init: () => Promise<WasmModelInitResult>): void {
  // Save the initializer, which will be used when the runner calls `initModel`
  // on the worker
  initWasmModel = init

  // Expose the worker implementation to `threads.js`
  expose(modelWorker)
}
