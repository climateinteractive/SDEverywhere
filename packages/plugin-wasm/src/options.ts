// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WasmPluginOptions {
  /**
   * The path to the Emscripten SDK.  If undefined, the plugin will walk up the directory
   * structure to find the nearest `emsdk` directory.
   */
  emsdkDir?: string

  /**
   * The path of the resulting JS file (containing the embedded Wasm model).  If undefined,
   * the plugin will write `wasm-model.js` to the configured `prepDir`.
   */
  outputJsPath?: string
}
