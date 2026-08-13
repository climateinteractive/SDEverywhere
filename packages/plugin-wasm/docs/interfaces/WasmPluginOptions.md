[@sdeverywhere/plugin-wasm](../index.md) / WasmPluginOptions

# Interface: WasmPluginOptions

## Properties

### emsdkDir?

> `optional` **emsdkDir?**: `string` \| (() => `string`)

The path to the Emscripten SDK.  If undefined, the plugin will walk up the directory
structure to find the nearest `emsdk` directory.

***

### emccArgs?

> `optional` **emccArgs?**: `string`[] \| (() => `string`[])

The array of additional arguments to pass to `emcc`.

Each element of the array is passed to `emcc` as a separate command line argument
(the arguments are not processed by a shell), so a `-s` option must be written
without a space between the flag and the option name, for example:
```js
  emccArgs: ['-sSTRICT=1', '-sASSERTIONS=1']
```
This is also the notation recommended by the
[Emscripten documentation](https://emscripten.org/docs/tools_reference/emcc.html).

If undefined, the plugin will use the following default set of arguments (as returned
by `defaultEmccArgs`), which are tuned for (and known to work with) Emscripten
versions 2.0.34 and 3.1.46, among others.
```
  -Wall
  -Os
  -sSTRICT=1
  -sMALLOC=emmalloc
  -sFILESYSTEM=0
  -sMODULARIZE=1
  -sSINGLE_FILE=1
  -sEXPORT_ES6=1
  -sUSE_ES6_IMPORT_META=0
  -sENVIRONMENT='web,webview,worker'
  -sEXPORTED_FUNCTIONS=['_malloc','_free','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']
  -sEXPORTED_RUNTIME_METHODS=['cwrap']
```

If you only need to add to the default arguments, use `defaultEmccArgs` instead of
repeating the full set, for example:
```js
  emccArgs: [...defaultEmccArgs(), '-sASSERTIONS=1']
```

***

### outputJsPath?

> `optional` **outputJsPath?**: `string`

The path of the resulting JS file (containing the embedded Wasm model).  If undefined,
the plugin will write `generated-model.js` to the configured `prepDir`.
