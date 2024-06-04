import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const genFormat = process.env.GEN_FORMAT === 'c' ? 'c' : 'js'

const outputVarNames = ['Y[A1]', 'Y[A2]']

export async function config() {
  return {
    genFormat,
    modelFiles: ['game-inputs.mdl'],
    modelSpec: async () => {
      return {
        inputs: [{ varName: 'X', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: outputVarNames.map(varName => ({ varName })),
        datFiles: []
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
