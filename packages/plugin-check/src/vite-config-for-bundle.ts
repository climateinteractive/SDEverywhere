// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, readFileSync, statSync } from 'fs'
import { dirname, join as joinPath, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, Plugin as VitePlugin } from 'vite'

import type { BuildContext, ResolvedModelSpec } from '@sdeverywhere/build'
import { encodeImplVars } from '@sdeverywhere/check-core'

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
function injectModelSpec(context: BuildContext, modelSpec: ResolvedModelSpec): VitePlugin {
  const prepDir = context.config.prepDir

  // Include the SDE variable ID with each spec
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
    const varId = context.canonicalVarId(modelInputSpec.varName)
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
      varId: context.canonicalVarId(o.varName),
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

  // Read the JSON model listing
  const listing = readJsonListing()

  // Extract the `varInstances` object from the model listing
  const varInstances = listing.varInstances || {}

  // Encode the `varInstances` object into a more efficient format to reduce the bundle size
  const encodedImplVars = encodeImplVars(varInstances)

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
export const encodedImplVars = ${JSON.stringify(encodedImplVars)};
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

export async function createViteConfigForBundle(
  context: BuildContext,
  modelSpec: ResolvedModelSpec
): Promise<InlineConfig> {
  // Use `template-bundle` as the root directory for the bundle project
  const root = resolvePath(__dirname, '..', 'template-bundle')

  // Calculate output directory relative to the template root
  // TODO: For now we write it to `prepDir`; make this configurable?
  const prepDir = context.config.prepDir
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
        }
      ]
    },

    plugins: [
      // Use a virtual module plugin to inject the model spec values
      injectModelSpec(context, modelSpec)
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
      }
    }
  }
}
