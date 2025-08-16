// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'

/**
 * Type declaration for a WebAssembly module wrapper produced
 * by the Emscripten compiler.  This only declares the minimal
 * set of fields needed by the SDEverywhere runtime.
 */
export interface WasmModule {
  readonly kind: 'wasm'

  readonly outputVarIds: OutputVarId[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly modelListing?: /*ModelListingSpecs*/ any

  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cwrap: (fname: string, rettype: string, argtypes: string[]) => any
  /** @hidden */
  _malloc: (numBytes: number) => number
  /** @hidden */
  _free: (byteOffset: number) => void
  /** @hidden */
  HEAP32: Int32Array
  /** @hidden */
  HEAPF64: Float64Array
}
