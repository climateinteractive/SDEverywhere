# @sdeverywhere/plugin-deploy

## Example

Example `sde.config.js` file:

```js
import { checkPlugin } from '@sdeverywhere/plugin-check'
import { deployPlugin } from '@sdeverywhere/plugin-deploy'
import { vitePlugin } from '@sdeverywhere/plugin-vite'
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
      // Generate a `worker.js` file that runs the model in a worker
      workerPlugin(),

      // Build or serve a web application using a provided Vite config file
      vitePlugin({
        // ...
      })

      // Run checks and comparison tests against the generated model
      checkPlugin({
        // ...
      })

      // Deploy the app and model-check report to GitHub Pages
      deployPlugin({
        // There are no required properties; see `DeployPluginOptions` below
        // for optional configuration
      })
    ]
  }
}
```

## Initialization

- [deployPlugin](functions/deployPlugin.md)

## Options

- [DeployPluginOptions](interfaces/DeployPluginOptions.md)
- [BuildProduct](interfaces/BuildProduct.md)
