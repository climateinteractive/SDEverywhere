// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ModelSpec } from '@sdeverywhere/build'
import { dirname, join as joinPath, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, Plugin as VitePlugin } from 'vite'

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

  const moduleSrc = `
export const startTime = ${modelSpec.startTime};
export const endTime = ${modelSpec.endTime};
export const inputSpecs = ${JSON.stringify(inputSpecs)};
export const outputSpecs = ${JSON.stringify(outputSpecs)};
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

export function createViteConfigForBundle(prepDir: string, modelSpec: ModelSpec): InlineConfig {
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
      }
    },

    // Use a virtual module plugin to inject the model spec values
    plugins: [injectModelSpec(modelSpec)],

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
