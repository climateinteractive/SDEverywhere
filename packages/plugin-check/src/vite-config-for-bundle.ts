// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, statSync } from 'fs'
import { dirname, join as joinPath, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, Plugin as VitePlugin } from 'vite'
import { nodeResolve } from '@rollup/plugin-node-resolve'

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
function injectModelSpec(prepDir: string, modelSpec: ModelSpec): VitePlugin {
  // Include the SDE variable ID with each spec
  const inputSpecs = modelSpec.inputs.map(i => {
    return {
      varId: sdeNameForVensimVarName(i.varName),
      ...i
    }
  })
  const outputSpecs = modelSpec.outputs.map(o => {
    return {
      varId: sdeNameForVensimVarName(o.varName),
      ...o
    }
  })

  function stagedFileSize(filename: string): number {
    const path = joinPath(prepDir, 'staged', 'model', filename)
    if (existsSync(path)) {
      return statSync(path).size
    } else {
      return 0
    }
  }

  // The size (in bytes) of the `wasm-model.js` file
  // TODO: Ideally we would measure the size of the raw WASM binary, but currently
  // we inline it as a base64 blob inside the JS file, so we take the size of the
  // whole JS file as the second best option
  const modelSizeInBytes = stagedFileSize('wasm-model.js')

  // The size (in bytes) of the `static-data.ts` file
  // TODO: Ideally we would measure the size of the minified JS file here, or
  // at least ignore things like whitespace
  const dataSizeInBytes = stagedFileSize('static-data.ts')

  const moduleSrc = `
export const startTime = ${modelSpec.startTime};
export const endTime = ${modelSpec.endTime};
export const inputSpecs = ${JSON.stringify(inputSpecs)};
export const outputSpecs = ${JSON.stringify(outputSpecs)};
export const modelSizeInBytes = ${modelSizeInBytes};
export const dataSizeInBytes = ${dataSizeInBytes};
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

export async function createViteConfigForBundle(prepDir: string, modelSpec: ModelSpec): Promise<InlineConfig> {
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
      alias: [
        // Inject the configured model worker
        {
          find: '@_model_worker_',
          replacement: modelWorkerPath
        },

        // XXX: Prevent Vite from using the `browser` section of `threads/package.json`
        // since we want to force the use of the general module (under dist-esm) that chooses
        // the correct implementation (Web Worker vs worker_threads) at runtime.  Currently
        // Vite's library mode is browser focused, so using a `customResolver` seems to be
        // the easiest way to prevent Vite from picking up the `browser` exports.
        {
          find: 'threads',
          replacement: 'threads',
          customResolver: async function (source, importer, options) {
            // Note that we need to use `resolveId.call` here in order to provide the
            // right `this` context, which provides Rollup plugin functionality
            const customResolver = nodeResolve({ browser: false })
            const resolved = await customResolver.resolveId.call(this, source, importer, options)
            // Force the use of the `dist-esm` variant of the threads.js package
            if (source === 'threads/worker') {
              return resolved.id.replace('worker.mjs', 'dist-esm/worker/index.js')
            } else {
              return resolved.id.replace('index.mjs', 'dist-esm/index.js')
            }
          }
        }
      ]
    },

    plugins: [
      // Use a virtual module plugin to inject the model spec values
      injectModelSpec(prepDir, modelSpec)
    ],

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,
      emptyOutDir: false,

      lib: {
        entry: './src/index.ts',
        formats: ['es'],
        fileName: () => 'check-bundle.js'
      },

      rollupOptions: {
        // Don't transform Node imports used by threads.js
        external: ['events', 'os', 'path', 'url'],

        // XXX: Insert custom code at the top of the generated bundle that defines
        // the special `__non_webpack_require__` function that is used by threads.js
        // in its Node implementation.  This import ensures that threads.js uses
        // the native `worker_threads` implementation when using the bundle in a
        // Node environment.  When importing the bundle for use in the browser,
        // Vite will transform this import into an empty module (it does not seem
        // to be necessary to define a polyfill).
        output: {
          banner: `
import * as worker_threads from 'worker_threads'
let __non_webpack_require__ = () => {
  return worker_threads;
};
`
        },

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
