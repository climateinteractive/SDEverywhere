# @sdeverywhere/plugin-wasm

## Example

Example `sde.config.js` file:

```js
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'

export async function config() {
  return {
    // Note that `plugin-wasm` requires the sde compiler to generate C code
    genFormat: 'c',

    modelFiles: ['example.mdl'],

    modelSpec: async () => {
      return {
        inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }],
        datFiles: []
      }
    },

    plugins: [
      // Generate a `generated-model.js` file containing the Wasm model
      wasmPlugin({
        // There are no required properties; see `WasmPluginOptions` below
        // for optional configuration
      })
    ]
  }
}
```

## Initialization

- [wasmPlugin](functions/wasmPlugin.md)

## Options

- [WasmPluginOptions](interfaces/WasmPluginOptions.md)

## Configuration

- [defaultEmccArgs](functions/defaultEmccArgs.md)
