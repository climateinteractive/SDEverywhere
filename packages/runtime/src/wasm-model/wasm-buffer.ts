// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { WasmModule } from './wasm-module'

/**
 * Wraps a `WebAssembly.Memory` buffer allocated on the wasm heap.
 *
 * When this is used synchronously (in the browser's normal JavaScript thread),
 * the client can use `getArrayView` to write directly into the underlying memory.
 *
 * Note, however, that `WebAssembly.Memory` buffers cannot be transferred to/from
 * a Web Worker.  When using this class in a worker thread, create a separate
 * `Float64Array` that can be transferred between the worker and the client running
 * in the browser's normal JS thread, and then use `getArrayView` to copy into and
 * out of the wasm buffer.
 *
 * @hidden This is currently an implementation detail used only by the `WasmModel` class.
 */
export class WasmBuffer<ArrType> {
  /**
   * @param wasmModule The `WasmModule` used to initialize the memory.
   * @param numElements The number of elements in the buffer.
   * @param byteOffset The byte offset within the wasm heap.
   * @param heapArray The array view on the underlying heap buffer.
   */
  constructor(
    private readonly wasmModule: WasmModule,
    public numElements: number,
    private byteOffset: number,
    private heapArray: ArrType
  ) {}

  /**
   * @return An `ArrType` view on the underlying heap buffer.
   */
  getArrayView(): ArrType {
    return this.heapArray
  }

  /**
   * @return The raw address of the underlying heap buffer.
   * @hidden This is intended for use by `WasmModel` only.
   */
  getAddress(): number {
    return this.byteOffset
  }

  /**
   * Dispose the buffer by freeing the allocated heap memory.
   */
  dispose(): void {
    if (this.heapArray) {
      this.wasmModule._free(this.byteOffset)
      this.numElements = undefined
      this.heapArray = undefined
      this.byteOffset = undefined
    }
  }
}

/**
 * Return a `WasmBuffer` that holds int32 elements.
 *
 * @hidden For internal use only.
 *
 * @param wasmModule The `WasmModule` used to initialize the memory.
 * @param numElements The number of elements in the buffer.
 */
export function createInt32WasmBuffer(wasmModule: WasmModule, numElements: number): WasmBuffer<Int32Array> {
  const elemSizeInBytes = 4
  const lengthInBytes = numElements * elemSizeInBytes
  const byteOffset = wasmModule._malloc(lengthInBytes)
  const elemOffset = byteOffset / elemSizeInBytes
  const heapArray = wasmModule.HEAP32.subarray(elemOffset, elemOffset + numElements)
  return new WasmBuffer<Int32Array>(wasmModule, numElements, byteOffset, heapArray)
}

/**
 * Return a `WasmBuffer` that holds float64 elements.
 *
 * @hidden For internal use only.
 *
 * @param wasmModule The `WasmModule` used to initialize the memory.
 * @param numElements The number of elements in the buffer.
 */
export function createFloat64WasmBuffer(wasmModule: WasmModule, numElements: number): WasmBuffer<Float64Array> {
  const elemSizeInBytes = 8
  const lengthInBytes = numElements * elemSizeInBytes
  const byteOffset = wasmModule._malloc(lengthInBytes)
  const elemOffset = byteOffset / elemSizeInBytes
  const heapArray = wasmModule.HEAPF64.subarray(elemOffset, elemOffset + numElements)
  return new WasmBuffer<Float64Array>(wasmModule, numElements, byteOffset, heapArray)
}
