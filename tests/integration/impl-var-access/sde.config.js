import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

export async function config() {
  return {
    modelFiles: ['impl-var-access.mdl'],

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
        postGenerateC: (_, cContent) => {
          // Edit the generated C code so that it enables the `SDE_USE_OUTPUT_INDICES` flag; this is
          // required in order to access impl (non-exported) model variables
          return cContent.replace('#define SDE_USE_OUTPUT_INDICES 0', '#define SDE_USE_OUTPUT_INDICES 1')
        }
      },

      // Generate a `wasm-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin()
    ]
  }
}
