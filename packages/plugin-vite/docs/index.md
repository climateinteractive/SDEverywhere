# @sdeverywhere/plugin-vite

## Example

Example `sde.config.js` file:

```js
import { vitePlugin } from '@sdeverywhere/plugin-vite'
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

      // Build or serve a web application using a provided Vite config file.
      // See `VitePluginOptions` for the full set of configuration options.
      vitePlugin({
        name: 'app',
        apply: {
          development: 'serve'
        },
        config: {
          configFile: 'app/vite.config.js'
        }
      })
    ]
  }
}
```

## Initialization

- [vitePlugin](functions/vitePlugin.md)

## Options

- [VitePluginOptions](interfaces/VitePluginOptions.md)
