import { copyFile } from 'fs/promises'
import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath('app', ...parts)
const generatedFilePath = (...parts) => appPath('src', 'model', 'generated', ...parts)

function input(varName, defaultValue) {
  return {
    varName,
    defaultValue,
    minValue: defaultValue,
    maxValue: defaultValue
  }
}

function output(varName) {
  return {
    varName
  }
}

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['model/houses.mdl'],

    // Specify the input and output variables
    modelSpec: async () => {
      return {
        inputs: [
          input('additional houses required value', 0),
          input('average house life', 0),
          input('time to plan to build', 3),
          input('time to build houses', 6),
          input('time to respond to gap', 8)
        ],
        outputs: [output('number of houses required'), output('houses completed')],
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
