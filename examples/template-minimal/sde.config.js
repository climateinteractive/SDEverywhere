import { checkPlugin } from '@sdeverywhere/plugin-check'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

export async function config() {
  return {
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
      // Generate a `wasm-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the Wasm model in a worker
      workerPlugin(),

      // Run model check
      checkPlugin()
    ]
  }
}
