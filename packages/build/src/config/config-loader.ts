// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, lstatSync, mkdirSync } from 'fs'
import { join as joinPath, resolve as resolvePath } from 'path'
import { pathToFileURL } from 'url'

import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

import type { BuildMode } from '../_shared/mode'
import type { ResolvedConfig } from '../_shared/resolved-config'

import type { UserConfig } from './user-config'

export interface ConfigResult {
  userConfig: UserConfig
  resolvedConfig: ResolvedConfig
}

/**
 * Load a user-defined config file or a given `UserConfig` object.  This validates
 * all paths and if successful, this returns a `ResolvedConfig`, otherwise returns
 * an error result.
 *
 * @param mode The build mode.
 * @param config The path to a config file, or a `UserConfig` object; if undefined,
 * this will look for a `sde.config.js` file in the current directory.
 * @param sdeDir Temporary (the path to the `@sdeverywhere/cli` package).
 * @param sdeCmdPath Temporary (the path to the `sde` command).
 * @return An `ok` result with the `ResolvedConfig`, otherwise an `err` result.
 */
export async function loadConfig(
  mode: BuildMode,
  config: string | UserConfig | undefined,
  sdeDir: string,
  sdeCmdPath: string
): Promise<Result<ConfigResult, Error>> {
  let userConfig: UserConfig
  if (typeof config === 'object') {
    // Use the given `UserConfig` object
    userConfig = config
  } else {
    // Load the project-specific config.  Note that on Windows the import path
    // must be a `file://` URL, so we have to convert here.  If no `--config`
    // arg was specified on the command line, look for a `sde.config.js` file
    // in the current directory, and failing that, use a default config.
    // TODO: Create a default config if no file found; for now, we just fail
    let configPath: string
    if (typeof config === 'string') {
      configPath = config
    } else {
      configPath = joinPath(process.cwd(), 'sde.config.js')
    }
    try {
      if (!existsSync(configPath)) {
        return err(new Error(`Cannot find config file '${configPath}'`))
      }
      const configUrl = pathToFileURL(configPath).toString()
      const configModule = await import(configUrl)
      userConfig = await configModule.config()
    } catch (e) {
      return err(new Error(`Failed to load config file '${configPath}'`))
    }
  }

  // Resolve the config
  try {
    const resolvedConfig = resolveUserConfig(userConfig, mode, sdeDir, sdeCmdPath)
    return ok({
      userConfig,
      resolvedConfig
    })
  } catch (e) {
    return err(e)
  }
}

/**
 * Resolve the given user configuration by resolving all paths.  This will create
 * the prep directory if it does not already exist.  This will throw an error if
 * any other paths are invalid or do not exist.
 *
 * @param userConfig The user-defined configuration.
 * @param mode The active build mode.
 * @param sdeDir Temporary (the path to the `@sdeverywhere/cli` package).
 * @param sdeCmdPath Temporary (the path to the `sde` command).
 * @return The resolved configuration.
 */
function resolveUserConfig(
  userConfig: UserConfig,
  mode: BuildMode,
  sdeDir: string,
  sdeCmdPath: string
): ResolvedConfig {
  function expectDirectory(propName: string, path: string): void {
    if (!existsSync(path)) {
      throw new Error(`The configured ${propName} (${path}) does not exist`)
    } else if (!lstatSync(path).isDirectory()) {
      throw new Error(`The configured ${propName} (${path}) is not a directory`)
    }
  }

  // function expectFile(propName: string, path: string): void {
  //   if (!existsSync(path)) {
  //     throw new Error(`The configured ${propName} (${path}) does not exist`)
  //     // TODO: Don't include the "is file" check for now; need to update this to
  //     // handle symlinks
  //     // } else if (!lstatSync(path).isFile()) {
  //     //   throw new Error(`The configured ${propName} (${path}) is not a file`)
  //   }
  // }

  // Validate the root directory
  let rootDir: string
  if (userConfig.rootDir) {
    // Verify that the configured root directory exists
    rootDir = resolvePath(userConfig.rootDir)
    expectDirectory('rootDir', rootDir)
  } else {
    // Use the current working directory as the project root
    rootDir = process.cwd()
  }

  // Validate the prep directory
  let prepDir: string
  if (userConfig.prepDir) {
    // Resolve the configured prep directory
    prepDir = resolvePath(userConfig.prepDir)
  } else {
    // Create an 'sde-prep' directory under the configured root directory
    prepDir = resolvePath(rootDir, 'sde-prep')
  }
  mkdirSync(prepDir, { recursive: true })

  // Validate the model files
  const userModelFiles = userConfig.modelFiles
  const modelFiles: string[] = []
  for (const userModelFile of userModelFiles) {
    const modelFile = resolvePath(userModelFile)
    if (!existsSync(modelFile)) {
      throw new Error(`The configured model file (${modelFile}) does not exist`)
    }
    modelFiles.push(modelFile)
  }

  // TODO: Validate the watch paths; these are allowed to be globs, so need to
  // figure out the best way to resolve them
  let modelInputPaths: string[]
  if (userConfig.modelInputPaths && userConfig.modelInputPaths.length > 0) {
    modelInputPaths = userConfig.modelInputPaths
  } else {
    modelInputPaths = modelFiles
  }
  let watchPaths: string[]
  if (userConfig.watchPaths && userConfig.watchPaths.length > 0) {
    watchPaths = userConfig.watchPaths
  } else {
    watchPaths = modelFiles
  }

  return {
    mode,
    rootDir,
    prepDir,
    modelFiles,
    modelInputPaths,
    watchPaths,
    sdeDir,
    sdeCmdPath
  }
}
