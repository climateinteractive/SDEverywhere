# @sdeverywhere/plugin-worker

## Example

Example `sde.config.js` file:

```js
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
      // Generate a `generated-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin({
        // There are no required properties; see `WorkerPluginOptions` below
        // for optional configuration
      })
    ]
  }
}
```

## Initialization

- [workerPlugin](functions/workerPlugin.md)

## Options

- [WorkerPluginOptions](interfaces/WorkerPluginOptions.md)
