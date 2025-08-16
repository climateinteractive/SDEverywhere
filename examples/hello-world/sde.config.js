import { checkPlugin } from '@sdeverywhere/plugin-check'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

export async function config() {
  return {
    modelFiles: ['model/sample.mdl'],

    modelSpec: async () => {
      return {
        inputs: [
          { varName: 'Production slope', defaultValue: 1, minValue: 1, maxValue: 10 },
          { varName: 'Production start year', defaultValue: 2020, minValue: 2020, maxValue: 2070 },
          { varName: 'Production years', defaultValue: 10, minValue: 0, maxValue: 30 }
        ],
        outputs: [{ varName: 'Total inventory' }]
      }
    },

    plugins: [
      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin(),

      // Run model check
      checkPlugin()
    ]
  }
}
