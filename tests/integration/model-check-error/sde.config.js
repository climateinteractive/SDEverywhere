// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { dirname, join as joinPath, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkPlugin } from '@sdeverywhere/plugin-check'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function config() {
  return {
    modelFiles: ['model-check-error.mdl'],

    modelSpec: async () => {
      return {
        inputs: [{ varName: 'Production slope', defaultValue: 1, minValue: 0, maxValue: 10 }],
        outputs: [{ varName: 'Total inventory' }]
      }
    },

    plugins: [
      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin(),

      // Run model check, using a custom test config that wraps the bundle so
      // that it throws a runtime error during `getDatasetsForScenario`
      checkPlugin({
        testConfigPath: resolvePath(joinPath(__dirname, 'test-config.js'))
      })
    ]
  }
}
