[@sdeverywhere/plugin-wasm](../index.md) / WasmPluginOptions

# Interface: WasmPluginOptions

## Properties

### emsdkDir

 `Optional` **emsdkDir**: `string`

The path to the Emscripten SDK.  If undefined, the plugin will walk up the directory
structure to find the nearest `emsdk` directory.

___

### outputJsPath

 `Optional` **outputJsPath**: `string`

The path of the resulting JS file (containing the embedded Wasm model).  If undefined,
the plugin will write `wasm-model.js` to the configured `prepDir`.
