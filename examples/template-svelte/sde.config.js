import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { configProcessor } from '@sdeverywhere/plugin-config'
import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = joinPath(__dirname, 'config')
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath('app', ...parts)
const corePath = (...parts) => packagePath('core', ...parts)

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['model/MODEL_NAME.mdl'],

    // The following files will be hashed to determine whether the model needs
    // to be rebuilt when watch mode is active
    modelInputPaths: ['model/MODEL_NAME.mdl'],

    // The following files will cause the model to be rebuilt when watch mode is
    // is active.  Note that these are globs so we use forward slashes regardless
    // of platform.
    watchPaths: ['config/**', 'model/MODEL_NAME.mdl'],

    // Read csv files from `config` directory
    modelSpec: configProcessor({
      config: configDir,
      out: corePath()
    }),

    plugins: [
      // Generate a `worker.js` file that runs the model asynchronously on a
      // worker thread for improved responsiveness
      workerPlugin({
        outputPaths: [corePath('src', 'model', 'generated', 'worker.js')]
      }),

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
