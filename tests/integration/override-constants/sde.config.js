import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

export async function config() {
  return {
    genFormat,
    modelFiles: ['override-constants.mdl'],
    modelSpec: async () => {
      return {
        inputs: ['X'],
        outputs: ['A[A1]', 'A[A2]', 'B[A1,B1]', 'B[A1,B2]', 'B[A1,B3]', 'B[A2,B1]', 'B[A2,B2]', 'B[A2,B3]', 'C'],
        bundleListing: true,
        customConstants: true
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
