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
      ],

      // XXX: Prevent Vite from using the `browser` section of `threads/package.json`
      // since we want to force the use of the general module (under dist) that chooses
      // the correct implementation (Web Worker vs worker_threads) at runtime.  This
      // gets the job done, but is fragile because it applies to all dependencies even
      // though we really only need this workaround for the threads package.  Fortunately
      // the worker template is very simple (only depends on `@sdeverywhere/runtime-async`,
      // which in turn only depends on `@sdeverywhere/runtime` and `threads`, so we should
      // be safe to use this workaround for a while.  Note that the default value of this
      // property is `['browser', 'module', 'jsnext:main', 'jsnext']`, so we override it
      // to omit the 'browser' item.
      mainFields: ['module', 'jsnext:main', 'jsnext']
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
      },

      rollupOptions: {
        onwarn: (warning, warn) => {
          // XXX: Suppress "Use of eval is strongly discouraged" warnings that are
          // triggered by use of the following pattern in threads.js:
          //   eval("require")("worker_threads")
          // It would be nice to avoid use of `eval` there, but it's not critical for
          // our use case so we will suppress the warnings for now
          if (warning.code !== 'EVAL') {
            warn(warning)
          }
        }
      }
    }
  }
}
