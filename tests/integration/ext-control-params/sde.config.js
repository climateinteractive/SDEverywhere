import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

export async function config() {
  return {
    modelFiles: ['ext-control-params.mdl'],

    modelSpec: async () => {
      return {
        inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }],
        datFiles: []
      }
    },

    plugins: [
      // XXX: Include a custom plugin that applies post-processing steps.  This is
      // a workaround for issue #303 where external data files can't be resolved.
      {
        postProcessMdl: (_, mdlContent) => {
          return mdlContent.replaceAll('ext-control-params.csv', '../ext-control-params.csv')
        }
      },

      // Generate a `generated-model.js` file containing the Wasm model
      wasmPlugin(),

      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin()
    ]
  }
}
