import { checkPlugin } from '@sdeverywhere/plugin-check'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

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
const genFormat = 'js'

export async function config() {
  return {
    // Specify the format of the generated code, either 'js' or 'c'
    genFormat,

    // Specify the Vensim model to read
    modelFiles: ['MODEL_NAME.mdl'],

    modelSpec: async () => {
      return {
        inputs: [
          // TODO: List your input variables here
          { varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }
        ],
        outputs: [
          // TODO: List your output variables here
          { varName: 'Z' }
        ],
        datFiles: [
          // TODO: If your mdl refers to vdfx files, list dat files here (first
          // convert vdfx to dat, since SDEverywhere only supports dat format)
        ]
      }
    },

    plugins: [
      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin(),

      // Run model check
      checkPlugin()
    ]
  }
}
