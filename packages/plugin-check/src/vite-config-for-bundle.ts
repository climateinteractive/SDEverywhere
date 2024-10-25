// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, readFileSync, statSync } from 'fs'
import { basename, dirname, join as joinPath, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, ResolvedConfig, Plugin as VitePlugin } from 'vite'
import { nodeResolve } from '@rollup/plugin-node-resolve'

import type { ResolvedModelSpec } from '@sdeverywhere/build'

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
function injectModelSpec(prepDir: string, modelSpec: ResolvedModelSpec): VitePlugin {
  // Include the SDE variable ID with each input variable spec
  const inputSpecs = []
  for (const modelInputSpec of modelSpec.inputs) {
    // Note that the `InputSpec` interface in the `@sdeverywhere/build` package
    // allows the default/min/max values to be undefined, which can be the case
    // if the user doesn't return full `InputSpec` instances in the `ModelSpec`.
    // We will log a warning and skip the input if these values are not defined.
    if (
      modelInputSpec.defaultValue === undefined ||
      modelInputSpec.minValue === undefined ||
      modelInputSpec.maxValue === undefined
    ) {
      let msg = ''
      msg += `WARNING: The {defaultValue,minValue,maxValue} properties are required by plugin-check, `
      msg += `but are undefined in the InputSpec for '${modelInputSpec.varName}'. `
      msg += `This input variable will be excluded from the model-check bundle until those properties `
      msg += `are defined.`
      console.warn(msg)
      continue
    }

    // Use the `inputId` if defined for the `InputSpec`, otherwise use `varId`.  The
    // latter is less resilient if the variable is renamed between two versions of
    // the model, but will be sufficient for now.  Note that `plugin-config` defines
    // a stable `inputId` for each row in the `inputs.csv`, and that is the most
    // common way to configure a `ModelSpec`, so it will be uncommon for `inputId`
    // to be undefined here.
    const varId = sdeNameForVensimVarName(modelInputSpec.varName)
    const inputId = modelInputSpec.inputId || varId
    inputSpecs.push({
      inputId,
      varId,
      ...modelInputSpec
    })
  }

  // Include the SDE variable ID with each output variable spec
  const outputSpecs = modelSpec.outputs.map(o => {
    return {
      varId: sdeNameForVensimVarName(o.varName),
      ...o
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readJsonListing(): any {
    const path = joinPath(prepDir, 'build', 'processed.json')
    if (existsSync(path)) {
      const json = readFileSync(path, 'utf8')
      return JSON.parse(json)
    } else {
      return {}
    }
  }

  // Read the JSON model listing and include impl var specs from `varInstances`
  const listing = readJsonListing()
  const varInstances = listing.varInstances || {}

  function stagedFileSize(filename: string): number {
    const path = joinPath(prepDir, 'staged', 'model', filename)
    if (existsSync(path)) {
      return statSync(path).size
    } else {
      return 0
    }
  }

  // The size (in bytes) of the `generated-model.js` file
  // TODO: Ideally we would measure the size of the raw Wasm binary, but currently
  // we inline it as a base64 blob inside the JS file, so we take the size of the
  // whole JS file as the second best option
  const modelSizeInBytes = stagedFileSize('generated-model.js')

  // The size (in bytes) of the `static-data.ts` file
  // TODO: Ideally we would measure the size of the minified JS file here, or
  // at least ignore things like whitespace
  const dataSizeInBytes = stagedFileSize('static-data.ts')

  const moduleSrc = `
export const inputSpecs = ${JSON.stringify(inputSpecs)};
export const outputSpecs = ${JSON.stringify(outputSpecs)};
export const implSpec = ${JSON.stringify(varInstances)};
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

/**
 * XXX: This overrides the built-in `vite:resolve` plugin so that we can intercept `resolveId`
 * calls for the threads package.
 */
function overrideViteResolvePlugin(viteConfig: ResolvedConfig) {
  const resolvePlugin = viteConfig.plugins.find(p => p.name === 'vite:resolve')
  if (resolvePlugin === undefined) {
    throw new Error('Failed to locate the built-in vite:resolve plugin')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalResolveId = resolvePlugin.resolveId as any
  resolvePlugin.resolveId = async function resolveId(id, importer, options) {
    if (id.startsWith('./implementation') && importer.includes('threads/dist-esm')) {
      // XXX: The default resolver behavior will look at the `browser` mappings in
      // `threads/package.json` and try to resolve `implementation.js` to
      // `implementation.browser.js` because it thinks we're in a browser-only context.
      // We don't want that.  Instead we want to keep the generic implementation from
      // threads that chooses between the Node and browser implementations at runtime.
      //
      // If we get here, importer will be something like:
      //   /.../node_modules/.pnpm/threads@1.7.0/node_modules/threads/dist-esm/{worker,master}/index.js
      // And id will be:
      //   ./implementation
      // So resolve the ID to:
      //   /.../node_modules/.pnpm/threads@1.7.0/node_modules/threads/dist-esm/{worker,master}/implementation.js
      //
      // Or, importer will be:
      //   /.../node_modules/.pnpm/threads@1.7.0/node_modules/threads/dist-esm/{worker,master}/implementation.js
      // And id will be one of:
      //   ./implementation.browser
      //   ./implementation.node
      //   ./implementation.worker_threads
      // So resolve the ID to:
      //   /.../node_modules/.pnpm/threads@1.7.0/node_modules/threads/dist-esm/{worker,master}/implementation.{...}.js
      const idFileName = id.replace('./', '')
      const importerFileName = basename(importer)
      const resolvedId = importer.replace(importerFileName, `${idFileName}.js`)
      return {
        id: resolvedId,
        moduleSideEffects: false
      }
    }

    // For all other cases, fall back on the default resolver
    return originalResolveId.call(this, id, importer, options)
  }
}

export async function createViteConfigForBundle(prepDir: string, modelSpec: ResolvedModelSpec): Promise<InlineConfig> {
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
        // Vite's library mode is browser focused and generally chooses the right imports,
        // except in the case of the threads package where we want to use the generic
        // `implementation.js` that chooses between Web Worker and worker_threads at runtime.
        // Note that we could in theory set `resolve.browserField` to false, but that would
        // make Vite not use the browser field for all other packages, and there is not
        // currently a way to tell Vite to use the browser field on a case-by-case basis.
        // So for now we need this workaround here to make it resolve to `dist-esm`, and then
        // a second workaround in `overrideViteResolvePlugin` to prevent the resolver from
        // using the browser field when resolving the threads package.
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
      injectModelSpec(prepDir, modelSpec),

      // XXX: Install a wrapper around the built-in `vite:resolve` plugin so that we can
      // override the default resolver behavior that tries to resolve the `browser` section
      // of the `package.json` for the threads package.
      {
        name: 'vite-plugin-override-resolve',
        configResolved(viteConfig) {
          overrideViteResolvePlugin(viteConfig)
        }
      }
    ],

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,
      emptyOutDir: false,

      // Uncomment for debugging purposes
      // minify: false,

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
        // Vite will transform this import into an empty module due to the empty
        // polyfill that is configured in `vite-config-for-report.ts`.
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
