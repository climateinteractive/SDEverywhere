import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { checkPlugin } from '@sdeverywhere/plugin-check'
import { configProcessor } from '@sdeverywhere/plugin-config'
import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = joinPath(__dirname, 'config')
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath('app', ...parts)
const corePath = (...parts) => packagePath('core', ...parts)

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['MODEL_NAME.mdl'],

    // The following files will be hashed to determine whether the model needs
    // to be rebuilt when watch mode is active
    modelInputPaths: ['MODEL_NAME.mdl'],

    // The following files will cause the model to be rebuilt when watch mode is
    // is active.  Note that these are globs so we use forward slashes regardless
    // of platform.
    watchPaths: ['config/**', 'MODEL_NAME.mdl'],

    // Read csv files from `config` directory
    modelSpec: configProcessor({
      config: configDir,
      out: corePath()
    }),

    plugins: [
      // Generate a `generated-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin({
        outputPaths: [corePath('src', 'model', 'generated', 'worker.js')]
      }),

      // Run model check
      checkPlugin(),

      // Build or serve the model explorer app
      vitePlugin({
        name: 'app',
        apply: {
          development: 'serve'
        },
        config: {
          configFile: appPath('vite.config.js')
        }
      })
    ]
  }
}
