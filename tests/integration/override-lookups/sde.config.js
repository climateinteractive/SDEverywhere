import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

const outputVarNames = ['A[A1]', 'A[A2]', 'B[A1,B1]', 'B[A1,B2]', 'B[A1,B3]', 'B[A2,B1]', 'B[A2,B2]', 'B[A2,B3]', 'C']

export async function config() {
  return {
    genFormat,
    modelFiles: ['override-lookups.mdl'],
    modelInputPaths: ['*.dat'],
    modelSpec: async () => {
      return {
        inputs: [{ varName: 'X', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: outputVarNames.map(varName => ({ varName })),
        datFiles: ['../override-lookups.dat']
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
