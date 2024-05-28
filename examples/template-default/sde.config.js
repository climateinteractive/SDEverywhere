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

//
// NOTE: This template can generate a model as a WebAssembly module (runs faster,
// but requires additional tools to be installed) or in pure JavaScript format (runs
// slower, but is simpler to build).  Regardless of which approach you choose, the
// same APIs (e.g., `ModelRunner`) can be used to run the generated model.
//
// If `genFormat` is 'c', the sde compiler will generate C code, but `plugin-wasm`
// is needed to convert the C code to a WebAssembly module, in which case
// the Emscripten SDK must be installed (the `@sdeverywhere/create` package can
// help with this; see "Quick Start" instructions).
//
// If `genFormat` is 'js', the sde compiler will generate JavaScript code that runs
// in the browser or in Node.js without the additional Emscripten build step.
//
// TODO: Until new `@sdeverywhere` packages that support JS code generation are
// published on the npm registry, the only working option here is 'c'.  The default
// value will be set to 'js' once those new packages are published.
const genFormat = 'c'

export async function config() {
  return {
    // Specify the format of the generated code, either 'js' or 'c'
    genFormat,

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
      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the model asynchronously on a
      // worker thread for improved responsiveness
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
