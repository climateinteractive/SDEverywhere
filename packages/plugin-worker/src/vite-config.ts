// Copyright (c) 2022 Climate Interactive / New Venture Fund. All rights reserved.

import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, Plugin as VitePlugin } from 'vite'

import type { ModelSpec } from '@sdeverywhere/build'

import { sdeNameForVensimVarName } from './var-names'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * This is a virtual module plugin used to inject model-specific configuration
 * values into the generated worker bundle.
 *
 * This follows the "Virtual Modules Convention" described here:
 *   https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention
 *
 * TODO: This could be simplified by using `vite-plugin-virtual` but that
 * doesn't seem to be working correctly in an ESM setting
 */
function injectModelSpec(modelSpec: ModelSpec): VitePlugin {
  const outputVarIds = modelSpec.outputVarNames.map(name => sdeNameForVensimVarName(name))

  const moduleSrc = `
export const startTime = ${modelSpec.startTime};
export const endTime = ${modelSpec.endTime};
export const numInputs = ${modelSpec.inputVarNames.length};
export const outputVarIds = ${JSON.stringify(outputVarIds)};
`

  const virtualModuleId = 'virtual:model-spec'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-virtual-custom',
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        return moduleSrc
      }
    }
  }
}

/**
 * Create a Vite `InlineConfig` that can be used to build a complete
 * worker bundle that can run the generated Wasm model in a separate
 * Web Worker or Node worker thread.
 *
 * @param stagedModelDir The `staged` directory under the `sde-prep` directory.
 * @param modelJsFile The name of the JS file containing the embedded Wasm.
 * @param modelSpec The model spec generated earlier in the build process.
 * @param outputFile The name of the generated worker JS file.
 * @return An `InlineConfig` instance that can be passed to Vite's `build` function.
 */
export function createViteConfig(
  stagedModelDir: string,
  modelJsFile: string,
  modelSpec: ModelSpec,
  outputFile: string
): InlineConfig {
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
      alias: {
        // In the template, we use `@_wasm_` as an alias for the JS-wrapped Wasm
        // file generated by Emscripten
        '@_wasm_': resolvePath(stagedModelDir, modelJsFile),

        // XXX: Prevent Vite from using the `browser` section of `threads/package.json` since
        // we want to force the use of the general module (under dist) that chooses the correct
        // implementation (Web Worker vs worker_threads) at runtime
        // TODO: Use findUp to get correct path to threads package in node_modules
        threads: resolvePath(__dirname, `../../../node_modules/threads/dist`)
      }
    },

    // Use a virtual module plugin to inject the model spec values
    plugins: [injectModelSpec(modelSpec)],

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
