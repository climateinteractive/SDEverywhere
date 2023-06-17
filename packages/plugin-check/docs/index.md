# @sdeverywhere/plugin-check

## Example

Example `sde.config.js` file:

```js
import { checkPlugin } from '@sdeverywhere/plugin-check'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

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
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin(),

      // Run checks and comparison tests against the generated Wasm model
      checkPlugin({
        // There are no required properties; see `CheckPluginOptions` below
        // for optional configuration
      })
    ]
  }
}
```

## Initialization

- [checkPlugin](functions/checkPlugin.md)

## Options

- [CheckPluginOptions](interfaces/CheckPluginOptions.md)
- [CheckBundle](interfaces/CheckBundle.md)
