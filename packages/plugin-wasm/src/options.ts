// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WasmPluginOptions {
  /**
   * The path to the Emscripten SDK.
   */
  emsdkDir: string

  /**
   * The destination directory of the resulting JS file (containing the embedded Wasm model).
   */
  outputJsDir: string

  /**
   * The name of the resulting JS file (containing the embedded Wasm model).
   */
  outputJsFile: string
}
