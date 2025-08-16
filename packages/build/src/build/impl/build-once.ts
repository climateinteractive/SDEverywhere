// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join as joinPath } from 'path'

import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

import { clearOverlay, log } from '../../_shared/log'
import type { InputSpec, ModelSpec, OutputSpec, ResolvedModelSpec, VarName } from '../../_shared/model-spec'
import type { ResolvedConfig } from '../../_shared/resolved-config'

import type { UserConfig } from '../../config/user-config'
import { BuildContext } from '../../context/context'
import { StagedFiles } from '../../context/staged-files'
import type { Plugin } from '../../plugin/plugin'

import { generateModel } from './gen-model'
import { computeInputFilesHash } from './hash-files'

export interface BuildOnceOptions {
  forceModelGen?: boolean
  abortSignal?: AbortSignal
}

/**
 * Perform a single build.
 *
 * This will return an error if a build failure occurred, or if a plugin encounters
 * an error.  Otherwise, it will return true if the build and all plugins
 * succeeded, or false if a plugin wants to report a "soft" failure (for example,
 * if the model check plugin reports failing checks).
 *
 * @param config The resolved build configuration.
 * @param plugins The configured plugins.
 * @param options Options specific to the build process.
 * @return An `ok` result with true if the build and all plugins succeeded, or false if
 * one or more plugins failed; otherwise, an `err` result if there was a hard error.
 */
export async function buildOnce(
  config: ResolvedConfig,
  userConfig: UserConfig,
  plugins: Plugin[],
  options: BuildOnceOptions
): Promise<Result<boolean, Error>> {
  // Create the build context
  const stagedFiles = new StagedFiles(config.prepDir)
  const context = new BuildContext(config, stagedFiles, options.abortSignal)
  const modelHashPath = joinPath(config.prepDir, 'model-hash.txt')

  // Note that the entire body of this function is wrapped in a try/catch.  Any
  // errors that are thrown by plugin functions or the core `generateModel`
  // function will be caught and handled as appropriate.
  let succeeded = true
  try {
    // Get the model spec from the config
    const userModelSpec = await userConfig.modelSpec(context)
    if (userModelSpec === undefined) {
      return err(new Error('The model spec must be defined'))
    }

    // Resolve the model spec
    const modelSpec = resolveModelSpec(userModelSpec)

    // Run plugins that implement `preGenerate`
    for (const plugin of plugins) {
      if (plugin.preGenerate) {
        await plugin.preGenerate(context, modelSpec)
      }
    }

    // Write the spec file
    const specJson = {
      inputVarNames: modelSpec.inputVarNames,
      outputVarNames: modelSpec.outputVarNames,
      externalDatfiles: modelSpec.datFiles,
      bundleListing: modelSpec.bundleListing,
      customLookups: modelSpec.customLookups,
      customOutputs: modelSpec.customOutputs,
      ...modelSpec.options
    }
    const specPath = joinPath(config.prepDir, 'spec.json')
    await writeFile(specPath, JSON.stringify(specJson, null, 2))

    // Read the hash from the last successful model build, if available
    let previousModelHash: string
    if (existsSync(modelHashPath)) {
      previousModelHash = readFileSync(modelHashPath, 'utf8')
    } else {
      previousModelHash = 'NONE'
    }

    // The code gen and Wasm build steps are time consuming, so we avoid rebuilding
    // it if the build input files are unchanged since the last successful build
    const inputFilesHash = await computeInputFilesHash(config)
    let needModelGen: boolean
    if (options.forceModelGen === true) {
      needModelGen = true
    } else {
      const hashMismatch = inputFilesHash !== previousModelHash
      needModelGen = hashMismatch
    }

    if (needModelGen) {
      // Generate the model
      await generateModel(context, plugins)

      // Save the hash of the input files, which can be used to determine if
      // we need to rebuild the model the next time
      writeFileSync(modelHashPath, inputFilesHash)
    } else {
      // Skip code generation
      log('info', 'Skipping model code generation; already up-to-date')
    }

    // Run plugins that implement `postGenerate`
    // TODO: For now we run all plugins even if one or more of them returns
    // false, which allows (in theory) for there to be multiple plugins that
    // run tests or checks as a post-build step.  We should eventually make
    // this configurable so that a plugin can halt the build if it fails.
    // (Technically this is already possible if the plugin throws an error
    // instead of returning false, but maybe it should be more configurable.)
    for (const plugin of plugins) {
      if (plugin.postGenerate) {
        const pluginSucceeded = await plugin.postGenerate(context, modelSpec)
        if (!pluginSucceeded) {
          succeeded = false
        }
      }
    }

    // Copy staged files to their destination; this will only copy the staged
    // files if they are different than the existing destination files.  We
    // copy the files in a batch like this so that hot module reload is only
    // triggered once at the end of the whole build process.
    stagedFiles.copyChangedFiles()

    // Run plugins that implement `postBuild` (this is specified to run after
    // the "copy staged files" step)
    for (const plugin of plugins) {
      if (plugin.postBuild) {
        const pluginSucceeded = await plugin.postBuild(context, modelSpec)
        if (!pluginSucceeded) {
          succeeded = false
        }
      }
    }

    if (config.mode === 'development') {
      // Hide the "rebuilding" message in the dev overlay in the app if the
      // build succeeded; otherwise keep the error message visible
      log('info', 'Waiting for changes...\n')
      clearOverlay()
    }
  } catch (e) {
    // When a build is aborted, the error will have "ABORT" as the message,
    // in which case we can swallow the error; for actual errors, rethrow
    if (e.message !== 'ABORT') {
      // Clear the hash so that the model is rebuilt next time
      writeFileSync(modelHashPath, '')

      // Return an error result
      return err(e)
    }
  }

  return ok(succeeded)
}

/**
 * Convert a `ModelSpec` instance to a `ResolvedModelSpec` instance.
 *
 * @param modelSpec The `ModelSpec` instance returned by the `UserConfig`.
 */
function resolveModelSpec(modelSpec: ModelSpec): ResolvedModelSpec {
  let inputVarNames: VarName[]
  let inputSpecs: InputSpec[]
  if (modelSpec.inputs.length > 0) {
    const item = modelSpec.inputs[0]
    if (typeof item === 'string') {
      // The array contains variable names; derive `InputSpec` instances
      inputVarNames = modelSpec.inputs as VarName[]
      inputSpecs = inputVarNames.map(varName => {
        return {
          varName
        }
      })
    } else {
      // The array contains `InputSpec` objects; derive variable names
      inputSpecs = modelSpec.inputs as InputSpec[]
      inputVarNames = inputSpecs.map(spec => spec.varName)
    }
  } else {
    // The inputs array is empty, so return empty arrays
    inputVarNames = []
    inputSpecs = []
  }

  let outputVarNames: VarName[]
  let outputSpecs: OutputSpec[]
  if (modelSpec.outputs.length > 0) {
    const item = modelSpec.outputs[0]
    if (typeof item === 'string') {
      // The array contains variable names; derive `OutputSpec` instances
      outputVarNames = modelSpec.outputs as VarName[]
      outputSpecs = outputVarNames.map(varName => {
        return {
          varName
        }
      })
    } else {
      // The array contains `OutputSpec` objects; derive variable names
      outputSpecs = modelSpec.outputs as OutputSpec[]
      outputVarNames = outputSpecs.map(spec => spec.varName)
    }
  } else {
    // The outputs array is empty, so return empty arrays
    outputVarNames = []
    outputSpecs = []
  }

  let customLookups: boolean | VarName[]
  if (modelSpec.customLookups !== undefined) {
    customLookups = modelSpec.customLookups
  } else {
    customLookups = false
  }

  let customOutputs: boolean | VarName[]
  if (modelSpec.customOutputs !== undefined) {
    customOutputs = modelSpec.customOutputs
  } else {
    customOutputs = false
  }

  return {
    inputVarNames,
    inputs: inputSpecs,
    outputVarNames,
    outputs: outputSpecs,
    datFiles: modelSpec.datFiles || [],
    bundleListing: modelSpec.bundleListing === true,
    customLookups,
    customOutputs,
    options: modelSpec.options
  }
}
