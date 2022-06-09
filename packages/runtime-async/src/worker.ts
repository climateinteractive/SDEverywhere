// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { TransferDescriptor } from 'threads'
import { expose, Transfer } from 'threads/worker'

import type { WasmBuffer, WasmModel, WasmModelInitResult } from '@sdeverywhere/runtime'
import { perfElapsed, perfNow } from '@sdeverywhere/runtime'

/**
 * A function that asynchronously initializes a `WasmModel` and resolves when complete.
 */
export type InitWasmModel = () => Promise<WasmModelInitResult>

/** @hidden */
let initWasmModel: InitWasmModel
/** @hidden */
let wasmModel: WasmModel
/** @hidden */
let inputsWasmBuffer: WasmBuffer
/** @hidden */
let outputsWasmBuffer: WasmBuffer

interface InitResult {
  rowLength: number
  ioBuffer: ArrayBuffer
}

/** @hidden */
const modelWorker = {
  async initModel(): Promise<TransferDescriptor<InitResult>> {
    if (wasmModel) {
      throw new Error('WasmModel was already initialized')
    }

    // Initialize the wasm model and associated buffers
    const result = await initWasmModel()

    // Capture the `WasmModel` instance and `WasmBuffer` instances
    wasmModel = result.model
    inputsWasmBuffer = result.inputsBuffer
    outputsWasmBuffer = result.outputsBuffer

    // Create a combined array that will hold a copy of the inputs and outputs
    // wasm buffers; this buffer is no-copy transferable, whereas the wasm ones
    // are not allowed to be transferred
    const runTimeLength = 8
    const inputsLength = inputsWasmBuffer.getArrayView().length
    const outputsLength = outputsWasmBuffer.getArrayView().length
    const ioArray = new Float64Array(runTimeLength + inputsLength + outputsLength)

    // The row length is the number of elements in each row of the outputs buffer
    const rowLength = result.endTime - result.startTime + 1

    // Transfer the underlying buffer to the runner
    const ioBuffer = ioArray.buffer
    return Transfer({ rowLength, ioBuffer }, [ioBuffer])
  },

  runModel(ioBuffer: ArrayBuffer): TransferDescriptor<ArrayBuffer> {
    if (!wasmModel) {
      throw new Error('WasmModel must be initialized before running the model in worker')
    }

    // The run time is stored in the first 8 bytes
    const runTimeLengthInElements = 1
    const runTimeLengthInBytes = runTimeLengthInElements * 8

    // Copy the inputs into the wasm inputs buffer
    const inputsWasmArray = inputsWasmBuffer.getArrayView()
    const inputsLengthInElements = inputsWasmArray.length
    const inputsLengthInBytes = inputsLengthInElements * 8
    const inputsBufferArray = new Float64Array(ioBuffer, runTimeLengthInBytes, inputsLengthInElements)
    inputsWasmArray.set(inputsBufferArray)

    // Run the model using the wasm buffers
    const t0 = perfNow()
    wasmModel.runModel(inputsWasmBuffer, outputsWasmBuffer)
    const elapsed = perfElapsed(t0)

    // Write the model run time to the buffer
    const runTimeBufferArray = new Float64Array(ioBuffer, 0, runTimeLengthInElements)
    runTimeBufferArray[0] = elapsed

    // Copy the outputs from the wasm outputs buffer
    const outputsOffsetInBytes = runTimeLengthInBytes + inputsLengthInBytes
    const outputsBufferArray = new Float64Array(ioBuffer, outputsOffsetInBytes)
    outputsBufferArray.set(outputsWasmBuffer.getArrayView())

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
export function exposeModelWorker(init: InitWasmModel): void {
  // Save the initializer, which will be used when the runner calls `initModel`
  // on the worker
  initWasmModel = init

  // Expose the worker implementation to `threads.js`
  expose(modelWorker)
}
