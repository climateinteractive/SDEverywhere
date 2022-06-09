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
 */
export class WasmBuffer {
  private byteOffset: number
  private heapArray: Float64Array

  /**
   * @param wasmModule The `WasmModule` used to initialize the memory.
   * @param numElements The number of 64-bit `double` elements in the buffer.
   */
  constructor(private readonly wasmModule: WasmModule, numElements: number) {
    const sizeOfFloat64 = 8
    const lengthInBytes = numElements * sizeOfFloat64
    this.byteOffset = wasmModule._malloc(lengthInBytes)
    const float64Offset = this.byteOffset / sizeOfFloat64
    this.heapArray = wasmModule.HEAPF64.subarray(float64Offset, float64Offset + numElements)
  }

  /**
   * @return A new `Float64Array` view on the underlying heap buffer.
   */
  getArrayView(): Float64Array {
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
      this.heapArray = undefined
      this.byteOffset = undefined
    }
  }
}
