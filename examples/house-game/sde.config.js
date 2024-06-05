import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath('app', ...parts)
const generatedFilePath = (...parts) => appPath('src', 'model', 'generated', ...parts)

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['model/houses.mdl'],

    // Specify the input and output variables
    modelSpec: async () => {
      return {
        inputs: [
          'additional houses required value',
          'average house life',
          'time to plan to build',
          'time to build houses',
          'time to respond to gap'
        ],
        outputs: ['number of houses required', 'houses completed'],
        datFiles: ['../model/houses.dat']
      }
    },

    // Copy the generated model listing to the app so that it can be loaded
    // at runtime
    outListingFile: generatedFilePath('listing.json'),

    plugins: [
      // Generate a `worker.js` file that runs the generated model in a worker
      workerPlugin({
        outputPaths: [generatedFilePath('worker.js')]
      }),

      // Build or serve the app
      vitePlugin({
        name: 'app',
        apply: {
          development: 'serve'
        },
        config: {
          configFile: appPath('vite.config.js')
        }
      })
    ]
  }
}
