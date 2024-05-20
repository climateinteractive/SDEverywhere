// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WasmPluginOptions {
  /**
   * The path to the Emscripten SDK.  If undefined, the plugin will walk up the directory
   * structure to find the nearest `emsdk` directory.
   */
  emsdkDir?: string | (() => string)

  /**
   * The array of additional arguments to pass to `emcc`.  If undefined, the plugin will
   * use the following default set of arguments, which are tuned for (and known to work
   * with) Emscripten versions 2.0.34 and 3.1.46, among others.
   * ```
   *   -Wall
   *   -Os
   *   -s STRICT=1
   *   -s MALLOC=emmalloc
   *   -s FILESYSTEM=0
   *   -s MODULARIZE=1
   *   -s SINGLE_FILE=1
   *   -s EXPORT_ES6=1
   *   -s USE_ES6_IMPORT_META=0
   *   -s ENVIRONMENT='web,webview,worker'
   *   -s EXPORTED_FUNCTIONS=['_malloc','_free','_getMaxOutputIndices','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']
   *   -s EXPORTED_RUNTIME_METHODS=['cwrap']
   * ```
   */
  emccArgs?: string[] | (() => string[])

  /**
   * The path of the resulting JS file (containing the embedded Wasm model).  If undefined,
   * the plugin will write `wasm-model.js` to the configured `prepDir`.
   */
  outputJsPath?: string
}
