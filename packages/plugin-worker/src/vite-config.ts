// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Create a Vite `InlineConfig` that can be used to build a complete
 * worker bundle that can run the generated Wasm model in a separate
 * Web Worker or Node worker thread.
 *
 * @param stagedModelDir The `staged` directory under the `sde-prep` directory.
 * @param modelJsFile The name of the JS file containing the generated JS or Wasm model.
 * @param outputFile The name of the generated worker JS file.
 * @return An `InlineConfig` instance that can be passed to Vite's `build` function.
 */
export function createViteConfig(stagedModelDir: string, modelJsFile: string, outputFile: string): InlineConfig {
  // Use `staged/model` as the root directory for the worker build
  const root = stagedModelDir

  // Use `template-worker/worker.js` from this package as the entry file
  const entry = resolvePath(__dirname, '..', 'template-worker', 'worker.js')

  return {
    // Don't use an external config file
    configFile: false,

    // Use the root directory configured above
    root,

    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // Disable vite output by default
    // TODO: Re-enable logging if `--verbose` option is used?
    logLevel: 'silent',

    // Configure path aliases
    resolve: {
      alias: [
        // In the template, we use `@_generatedModelFile_` as an alias for the model
        // file containing the generated JS or Wasm model
        {
          find: '@_generatedModelFile_',
          replacement: resolvePath(stagedModelDir, modelJsFile)
        }
      ]
    },

    build: {
      // Write output file to the `staged/model` directory; note that this path is
      // relative to the bundle `root` directory
      outDir: '.',
      emptyOutDir: false,

      lib: {
        entry,
        name: 'worker',
        formats: ['iife'],
        fileName: () => outputFile
      }
    }
  }
}
