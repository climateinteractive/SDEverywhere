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
   * The path of the resulting JS file (containing the embedded Wasm model).  If undefined,
   * the plugin will write `generated-model.js` to the configured `prepDir`.
   */
  outputJsPath?: string
}
