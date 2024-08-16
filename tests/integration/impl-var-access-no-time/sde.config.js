import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

export async function config() {
  return {
    genFormat,
    modelFiles: ['impl-var-access-no-time.mdl'],

    modelSpec: async () => {
      return {
        inputs: ['X'],
        outputs: ['Z', 'D[A1]'],
        customOutputs: true
      }
    },

    plugins: [
      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin()
    ]
  }
}
