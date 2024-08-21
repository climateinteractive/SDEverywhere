import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

export async function config() {
  return {
    genFormat,
    modelFiles: ['ext-control-params.mdl'],

    modelSpec: async () => {
      return {
        inputs: ['Y'],
        outputs: ['Z']
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

      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin()
    ]
  }
}
