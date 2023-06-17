# @sdeverywhere/plugin-wasm

## Example

Example `sde.config.js` file:

```js
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'

export async function config() {
  return {
    modelFiles: ['example.mdl'],

    modelSpec: async () => {
      return {
        inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }],
        datFiles: []
      }
    },

    plugins: [
      // Generate a `wasm-model.js` file containing the Wasm model
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
