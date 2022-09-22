import { checkPlugin } from '@sdeverywhere/plugin-check'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

export async function config() {
  return {
    modelFiles: ['MODEL_NAME.mdl'],

    modelSpec: async () => {
      return {
        // TODO: Change these values as desired (usually they will be the same as
        // the `INITIAL TIME` and `FINAL TIME` values from the mdl, but you can
        // use different values here)
        startTime: 2000,
        endTime: 2100,
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
