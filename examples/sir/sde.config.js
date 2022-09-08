import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { checkPlugin } from '@sdeverywhere/plugin-check'
import { configProcessor } from '@sdeverywhere/plugin-config-csv'
import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const baseName = 'sir'
const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = joinPath(__dirname, 'config')
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath(`${baseName}-app`, ...parts)
const corePath = (...parts) => packagePath(`${baseName}-core`, ...parts)

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['model/sir.mdl'],

    // Read csv files from `config` directory
    modelSpec: configProcessor({
      config: configDir,
      out: corePath()
    }),

    plugins: [
      // Generate a `wasm-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin({
        outputPaths: [corePath('src', 'model', 'generated', 'worker.js')]
      }),

      // Build or serve the model explorer app
      vitePlugin({
        name: `${baseName}-app`,
        apply: {
          development: 'serve'
        },
        config: {
          configFile: appPath('vite.config.js')
        }
      }),

      // Run model check
      checkPlugin()
    ]
  }
}
