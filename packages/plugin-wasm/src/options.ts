// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WasmPluginOptions {
  /**
   * The path to the Emscripten SDK.  If undefined, the plugin will walk up the directory
   * structure to find the nearest `emsdk` directory.
   */
  emsdkDir?: string | (() => string)

  /**
   * The array of additional arguments to pass to `emcc`.
   *
   * Each element of the array is passed to `emcc` as a separate command line argument
   * (the arguments are not processed by a shell), so a `-s` option must be written
   * without a space between the flag and the option name, for example:
   * ```js
   *   emccArgs: ['-sSTRICT=1', '-sASSERTIONS=1']
   * ```
   * This is also the notation recommended by the
   * [Emscripten documentation](https://emscripten.org/docs/tools_reference/emcc.html).
   *
   * If undefined, the plugin will use the default set of arguments returned by
   * {@link defaultEmccArgs}.
   *
   * If you only need to add to the default arguments, use {@link defaultEmccArgs} instead
   * of repeating the full set, for example:
   * ```js
   *   emccArgs: [...defaultEmccArgs(), '-sASSERTIONS=1']
   * ```
   */
  emccArgs?: string[] | (() => string[])

  /**
   * The path of the resulting JS file (containing the embedded Wasm model, unless
   * `outputWasmPath` is defined).  If undefined, the plugin will write `generated-model.js`
   * to the configured `prepDir`.
   */
  outputJsPath?: string

  /**
   * The path of the resulting Wasm binary.  If undefined (the default), the Wasm binary is
   * embedded in the generated JS file as a base64-encoded string (using `-sSINGLE_FILE=1`).
   *
   * If defined, the Wasm binary is written to this path as a separate file, which is
   * smaller than the base64-encoded version and can be compiled by the browser while it
   * is being downloaded.  In this case, the application is responsible for loading the
   * binary and passing it to the module factory function exported by the generated JS
   * file, for example:
   * ```js
   *   const wasmBinary = await (await fetch(wasmUrl)).arrayBuffer()
   *   const wasmModule = await loadGeneratedModel({ wasmBinary })
   * ```
   * When `emccArgs` is undefined, the plugin uses the default arguments returned by
   * `defaultEmccArgs({ singleFile: false })`, which allow for this usage.  If you provide
   * your own `emccArgs`, make sure that they do not include `-sSINGLE_FILE=1`, and that
   * they include `-sINCOMING_MODULE_JS_API=['wasmBinary']` if they include `-sSTRICT=1`.
   */
  outputWasmPath?: string
}
