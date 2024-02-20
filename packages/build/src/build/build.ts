// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { join as joinPath } from 'path'

import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

import type { BuildMode } from '../_shared/mode'

import { loadConfig } from '../config/config-loader'
import type { UserConfig } from '../config/user-config'
import type { LogLevel } from '../_shared/log'
import { setOverlayFile, setActiveLevels } from '../_shared/log'
import { buildOnce } from './impl/build-once'
import { watch } from './impl/watch'

export interface BuildOptions {
  /** The path to an `sde.config.js` file, or a `UserConfig` object. */
  config?: string | UserConfig

  /**
   * The log levels to include.  If undefined, the default 'info' and 'error' levels
   * will be active.
   */
  logLevels?: LogLevel[]

  /**
   * The path to the `@sdeverywhere/cli` package.  This is currently only used to get
   * access to the files in the `src/c` directory.
   * @hidden This should be removed once we have tighter integration with the `cli` package.
   */
  sdeDir: string

  /**
   * The path to the `sde` command.
   * @hidden This should be removed once we have tighter integration with the `cli` package.
   */
  sdeCmdPath: string
}

export interface BuildResult {
  /**
   * The exit code that should be set by the process.  This will be undefined
   * if `mode` is 'development', indicating that the process should be kept alive.
   */
  exitCode?: number
}

/**
 * Initiate the build process, which can either be a single build if `mode` is
 * 'production', or a live development environment if `mode` is 'development'.
 *
 * @param mode The build mode.
 * @param options The build options.
 * @return An `ok` result if the build completed, otherwise an `err` result.
 */
export async function build(mode: BuildMode, options: BuildOptions): Promise<Result<BuildResult, Error>> {
  // Load the config
  const configResult = await loadConfig(mode, options.config, options.sdeDir, options.sdeCmdPath)
  if (configResult.isErr()) {
    return err(configResult.error)
  }
  const { userConfig, resolvedConfig } = configResult.value

  // Configure logging level
  if (options.logLevels !== undefined) {
    setActiveLevels(options.logLevels)
  }

  // Configure the overlay `messages.html` file, which is written under the
  // `sde-prep` directory.  For production builds, this file will remain empty.
  const messagesPath = joinPath(resolvedConfig.prepDir, 'messages.html')
  const overlayEnabled = mode === 'development'
  setOverlayFile(messagesPath, overlayEnabled)

  try {
    // Initialize plugins
    const plugins = userConfig.plugins || []
    for (const plugin of plugins) {
      if (plugin.init) {
        await plugin.init(resolvedConfig)
      }
    }

    if (mode === 'development') {
      // Enable dev mode (which will rebuild when watched files are changed).
      // First run an initial build so that we have a baseline, and then
      // once that is complete, enable file watchers.
      const buildResult = await buildOnce(resolvedConfig, userConfig, plugins, {})
      // TODO: We should trap errors here and keep the dev process
      // running if the initial build fails
      if (buildResult.isErr()) {
        return err(buildResult.error)
      }

      // Allow plugins to set up watchers after the initial build completes
      for (const plugin of plugins) {
        if (plugin.watch) {
          await plugin.watch(resolvedConfig)
        }
      }

      // Watch for changes to the source/model/test files
      watch(resolvedConfig, userConfig, plugins)

      // Return a build result with undefined exit code, indicating that the
      // process should be kept alive
      return ok({})
    } else {
      // Run a single build
      const buildResult = await buildOnce(resolvedConfig, userConfig, plugins, {})
      if (buildResult.isErr()) {
        return err(buildResult.error)
      }

      // Configure the exit code depending on whether any plugins failed.
      // Currently we use the following exit code values:
      //   0 == build succeeded, AND all plugins succeeded
      //   1 == build failed (or a plugin reported a "hard" error)
      //   2 == build succeeded, BUT one or more plugins failed
      const allPluginsSucceeded = buildResult.value
      const exitCode = allPluginsSucceeded ? 0 : 2
      return ok({ exitCode })
    }
  } catch (e) {
    return err(e)
  }
}
