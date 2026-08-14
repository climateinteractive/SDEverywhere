// Copyright (c) 2026 Climate Interactive / New Venture Fund

/**
 * Return the default set of arguments that the plugin passes to `emcc`, which are tuned
 * for (and known to work with) Emscripten versions 2.0.34 and 3.1.46, among others.
 * ```
 *   -Wall
 *   -Os
 *   -sSTRICT=1
 *   -sMALLOC=emmalloc
 *   -sFILESYSTEM=0
 *   -sMODULARIZE=1
 *   -sSINGLE_FILE=1
 *   -sEXPORT_ES6=1
 *   -sUSE_ES6_IMPORT_META=0
 *   -sENVIRONMENT='web,webview,worker'
 *   -sEXPORTED_FUNCTIONS=['_malloc','_free','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']
 *   -sEXPORTED_RUNTIME_METHODS=['cwrap']
 * ```
 *
 * This can be used to customize the arguments without having to repeat the full default
 * set, for example:
 * ```js
 *   wasmPlugin({
 *     emccArgs: [...defaultEmccArgs(), '-sASSERTIONS=1']
 *   })
 * ```
 *
 * @returns A new array containing the default `emcc` arguments.
 */
export function defaultEmccArgs(): string[] {
  return [
    '-Wall',
    '-Os',
    '-sSTRICT=1',
    '-sMALLOC=emmalloc',
    '-sFILESYSTEM=0',
    '-sMODULARIZE=1',
    '-sSINGLE_FILE=1',
    '-sEXPORT_ES6=1',
    '-sUSE_ES6_IMPORT_META=0',
    // Note: The following argument is used to override the default list of supported environments.
    // The problem is that the default list includes "node", but we can't use `USE_ES6_IMPORT_META=0`
    // if "node" is included in the list.  We want `USE_ES6_IMPORT_META=0` because using 1 causes
    // problems with our init code since we also use `SINGLE_FILE=1` (inlined wasm).  The bottom
    // line is that if we omit "node" from this list, the wasm will still work fine in both browser
    // and Node.js contexts (tested in Emscripten 2.0.34 and 3.1.46).
    `-sENVIRONMENT='web,webview,worker'`,
    `-sEXPORTED_FUNCTIONS=['_malloc','_free','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']`,
    `-sEXPORTED_RUNTIME_METHODS=['cwrap']`
  ]
}

/**
 * Matches an argument that includes both the `-s` flag and the option name in a single
 * string, for example `-s STRICT=1`.  The captured group is the option part, for example
 * `STRICT=1`.
 */
const flagWithSpace = /^-s\s+(.+)$/

/**
 * Normalize the given array of `emcc` arguments.
 *
 * Each argument is passed to `emcc` as a separate command line argument (without going
 * through a shell), so an argument that contains both the `-s` flag and the option name
 * (for example `-s STRICT=1`) will not be understood by `emcc`.  This function rewrites
 * such an argument to use the no-space notation that is recommended by the Emscripten
 * documentation (for example `-sSTRICT=1`).  It also removes surrounding whitespace and
 * drops empty arguments.
 *
 * @param args The arguments to normalize.
 * @returns The normalized arguments.
 */
export function normalizeEmccArgs(args: string[]): string[] {
  const normalizedArgs: string[] = []
  for (const arg of args) {
    const trimmedArg = arg.trim()
    if (trimmedArg.length === 0) {
      continue
    }
    const match = trimmedArg.match(flagWithSpace)
    normalizedArgs.push(match ? `-s${match[1]}` : trimmedArg)
  }
  return normalizedArgs
}
