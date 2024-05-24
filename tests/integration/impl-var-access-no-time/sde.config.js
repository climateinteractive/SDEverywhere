import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

export async function config() {
  return {
    genFormat,
    modelFiles: ['impl-var-access-no-time.mdl'],

    modelSpec: async () => {
      return {
        inputs: [{ varName: 'X', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }, { varName: 'D[A1]' }],
        datFiles: []
      }
    },

    plugins: [
      // Include a custom plugin that applies post-processing steps
      {
        postGenerateCode: (_, format, content) => {
          if (format === 'c') {
            // Edit the generated C code so that it enables the `SDE_USE_OUTPUT_INDICES` flag; this is
            // required in order to access impl (non-exported) model variables
            return content.replace('#define SDE_USE_OUTPUT_INDICES 0', '#define SDE_USE_OUTPUT_INDICES 1')
          } else {
            return content
          }
        }
      },

      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin()
    ]
  }
}
