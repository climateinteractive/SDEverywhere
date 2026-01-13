import { checkPlugin } from '@sdeverywhere/plugin-check'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

let baseline
if (process.env.TEST_BASELINE === 'remote-valid') {
  baseline = {
    name: 'base',
    url: 'http://localhost:9000/sde-prep/check-bundle.js'
  }
} else if (process.env.TEST_BASELINE === 'remote-invalid') {
  baseline = {
    name: 'base',
    url: 'http://localhost:9000/sde-prep/check-bundle-INVALID.js'
  }
} else if (process.env.TEST_BASELINE === 'local') {
  baseline = {
    name: 'base',
    path: 'sde-prep/check-bundle.js'
  }
}

export async function config() {
  return {
    modelFiles: ['model-check-test.mdl'],

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
      checkPlugin({
        baseline,
        remoteBundlesUrl: 'http://localhost:9000/remote-bundles.json',
        serverPort: 9001,
        fetchRemoteBundle: async url => {
          // Custom function that adds a custom header to verify it's being used
          console.log(`[custom fetchRemoteBundle] Fetching bundle from: ${url}`)
          const response = await fetch(url, {
            headers: {
              'X-Custom-Loader': 'integration-test'
            }
          })
          if (!response.ok) {
            throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`)
          }
          return response.text()
        }
      })
    ]
  }
}
