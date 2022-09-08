// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { join as joinPath } from 'path'

import type { BuildContext, InputSpec, ModelSpec, OutputSpec } from '@sdeverywhere/build'

import { createConfigContext } from './context'
import { writeModelSpec } from './gen-model-spec'
import { generateConfigSpecs, writeConfigSpecs } from './gen-config-specs'

export interface ConfigOutputPaths {
  /** The absolute path to the directory where model spec files will be written. */
  modelSpecsDir?: string

  /** The absolute path to the directory where config spec files will be written. */
  configSpecsDir?: string

  /** The absolute path to the directory where translated strings will be written. */
  stringsDir?: string
}

export interface ConfigOptions {
  /**
   * The absolute path to the directory containing the CSV config files.
   */
  config: string

  /**
   * Either a single path to a base output directory (in which case, the recommended
   * directory structure will be used) or a `ConfigOutputPaths` containing specific paths.
   * If a single string is provided, the following subdirectories will be used:
   *   <out-dir>/
   *     src/
   *       config/
   *         generated/
   *       model/
   *         generated/
   *     strings/
   */
  out?: string | ConfigOutputPaths
}

/**
 * Returns a function that can be passed as the `modelSpec` function for the SDEverywhere
 * `UserConfig`.  The returned function:
 *   - reads CSV files from a `config` directory
 *   - writes JS files to the configured output directories
 *   - returns a `ModelSpec` that guides the rest of the `sde` build process
 */
export function configProcessor(options: ConfigOptions): (buildContext: BuildContext) => Promise<ModelSpec> {
  return buildContext => {
    return processModelConfig(buildContext, options)
  }
}

async function processModelConfig(buildContext: BuildContext, options: ConfigOptions): Promise<ModelSpec> {
  const t0 = performance.now()

  // Resolve source (config) directory
  if (!existsSync(options.config)) {
    throw new Error(`The provided config dir '${options.config}' does not exist`)
  }

  // Resolve output directories
  let outModelSpecsDir: string
  if (options.out) {
    if (typeof options.out === 'string') {
      outModelSpecsDir = joinPath(options.out, 'src', 'model', 'generated')
    } else {
      outModelSpecsDir = options.out.modelSpecsDir
    }
  }

  let outConfigSpecsDir: string
  if (options.out) {
    if (typeof options.out === 'string') {
      outConfigSpecsDir = joinPath(options.out, 'src', 'config', 'generated')
    } else {
      outConfigSpecsDir = options.out.configSpecsDir
    }
  }

  let outStringsDir: string
  if (options.out) {
    if (typeof options.out === 'string') {
      outStringsDir = joinPath(options.out, 'strings')
    } else {
      outStringsDir = options.out.stringsDir
    }
  }

  // Create a container for strings, variables, etc
  const context = createConfigContext(buildContext, options.config)

  // Write the generated files
  context.log('info', 'Generating files...')

  if (outModelSpecsDir) {
    context.log('verbose', '  Writing model specs')
    writeModelSpec(context, outModelSpecsDir)
  }

  if (outConfigSpecsDir) {
    const configSpecs = generateConfigSpecs(context)
    context.log('verbose', '  Writing config specs')
    writeConfigSpecs(context, configSpecs, outConfigSpecsDir)
  }

  if (outStringsDir) {
    // context.log('verbose', '  Writing translated strings')
    // context.writeTranslationJsFiles(options.outStringsDir)
  }

  const t1 = performance.now()
  const elapsed = ((t1 - t0) / 1000).toFixed(1)
  context.log('info', `Done generating files (${elapsed}s)`)

  // TODO: model.csv
  const datFiles: string[] = []

  // export interface InputSpec {
  //   /** The variable name (as used in the modeling tool). */
  //   varName: string

  //   /** The default value for the input. */
  //   defaultValue: number

  //   /** The minimum value for the input. */
  //   minValue: number

  //   /** The maximum value for the input. */
  //   maxValue: number
  // }

  // TODO
  const inputs: InputSpec[] = []

  // /**
  //  * Describes a model output variable.
  //  */
  // export interface OutputSpec {
  //   /** The variable name (as used in the modeling tool). */
  //   varName: string
  // }

  // TODO
  const outputs: OutputSpec[] = []

  return {
    startTime: context.modelStartTime,
    endTime: context.modelEndTime,
    inputs,
    outputs,
    datFiles
  }
}
