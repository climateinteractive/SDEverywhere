// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, join as joinPath, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForBundle(prepDir: string): InlineConfig {
  // Use `template-bundle` as the root directory for the bundle project
  const root = resolvePath(__dirname, '..', 'template-bundle')

  // Calculate output directory relative to the template root
  // TODO: For now we write it to `prepDir`; make this configurable?
  const outDir = relative(root, prepDir)

  // Use the model worker from the staged directory
  // TODO: Make this configurable?
  const modelWorkerPath = joinPath(prepDir, 'staged', 'model', 'worker.js?raw')

  return {
    // Don't use an external config file
    configFile: false,

    // Use the root directory configured above
    root,

    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // TODO: Disable vite output by default?
    // logLevel: 'silent',

    // Configure path aliases
    resolve: {
      alias: {
        // Inject the configured model worker
        '@_model_worker_': modelWorkerPath

        // XXX: Prevent Vite from using the `browser` section of `threads/package.json` since
        // we want to force the use of the general module (under dist) that chooses the correct
        // implementation (Web Worker vs worker_threads) at runtime
        // threads: resolvePath(__dirname, `../../node_modules/threads/dist-esm`)
        // Include other aliases from the plugin options
        //...options.aliases
      }
    },

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,
      emptyOutDir: false,

      lib: {
        entry: './src/index.ts',
        formats: ['es'],
        fileName: () => 'check-bundle.js'
      }
    }
  }
}
