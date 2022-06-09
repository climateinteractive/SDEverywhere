// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

/**
 * Type declaration for a WebAssembly module wrapper produced
 * by the Emscripten compiler.  This only declares the minimal
 * set of fields needed by `WasmModel` and `WasmBuffer`.
 *
 * @hidden
 */
export interface WasmModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cwrap: (fname: string, rettype: string, argtypes: string[]) => any
  _malloc: (numBytes: number) => number
  _free: (byteOffset: number) => void
  HEAPF64: Float64Array
}
