// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { basename } from 'path'

import chokidar from 'chokidar'
import { globSync, isDynamicPattern } from 'tinyglobby'

import { clearOverlay, log, logError } from '../../_shared/log'
import type { ResolvedConfig } from '../../_shared/resolved-config'

import type { UserConfig } from '../../config/user-config'
import type { Plugin } from '../../plugin/plugin'

import type { BuildOnceOptions } from './build-once'
import { buildOnce } from './build-once'

class BuildState {
  readonly abortController = new AbortController()
}

export function watch(config: ResolvedConfig, userConfig: UserConfig, plugins: Plugin[]): void {
  // Add a small delay so that if multiple files are changed at once (as is
  // often the case when switching branches), we batch them up and start the
  // the build after things settle down
  const delay = 150
  const changedPaths: Set<string> = new Set()

  // Keep track of the current build so that we only have one active at a time
  let currentBuildState: BuildState

  function performBuild() {
    clearOverlay()

    // Log the input files that have changed
    for (const path of changedPaths) {
      log('info', `Input file ${basename(path)} has been changed`)
    }

    // Clear the set of pending files
    changedPaths.clear()

    // Keep track of builds; if one is already in progress, abort it
    // before starting another one
    if (currentBuildState) {
      currentBuildState.abortController.abort()
      // TODO: Prevent aborted build from logging?
      currentBuildState = undefined
    }

    // Generate files and build the model
    currentBuildState = new BuildState()
    const buildOptions: BuildOnceOptions = {
      abortSignal: currentBuildState.abortController.signal
    }
    buildOnce(config, userConfig, plugins, buildOptions)
      .then(result => {
        // Log the error message in case of error result
        if (result.isErr()) {
          logError(result.error)
        }
      })
      .catch(e => {
        // Also catch thrown errors that may have not already been
        // handled by `buildOnce`
        logError(e)
        // log('info', 'Waiting for changes...')
      })
      .finally(() => {
        currentBuildState = undefined
      })
  }

  function scheduleBuild(changedPath: string) {
    // Only schedule the build if the set is currently empty
    const schedule = changedPaths.size === 0

    // Add the path to the set of changed files
    changedPaths.add(changedPath)

    if (schedule) {
      // Schedule the build to start after a delay
      setTimeout(() => {
        performBuild()
      }, delay)
    }
  }

  let watchPaths: string[]
  if (config.watchPaths && config.watchPaths.length > 0) {
    // Watch the configured files
    watchPaths = config.watchPaths
  } else {
    // Only watch the mdl files
    watchPaths = config.modelFiles
  }

  // The chokidar package no longer supports glob patterns, so we need to resolve
  // glob patterns first and then pass the resolved paths to chokidar
  const resolvedWatchPaths: string[] = []
  for (const watchPath of watchPaths) {
    if (isDynamicPattern(watchPath)) {
      // This is a glob pattern; resolve files that match the pattern
      const paths = globSync(watchPath, {
        // Watch paths are resolved relative to the project root directory
        cwd: config.rootDir,
        // Resolve to absolute paths
        absolute: true
      })
      resolvedWatchPaths.push(...paths)
    } else {
      // This is regular file or directory path; let chokidar resolve it
      resolvedWatchPaths.push(watchPath)
    }
  }

  // Watch the config and model files; if changes are detected, generate the specs
  // and rebuild the model if needed
  const watcher = chokidar.watch(resolvedWatchPaths, {
    // Watch paths are resolved relative to the project root directory
    cwd: config.rootDir,
    // XXX: Include a delay, otherwise on macOS we sometimes get multiple
    // change events when the csv file is saved just once
    awaitWriteFinish: {
      stabilityThreshold: 200
    }
  })
  watcher.on('change', path => {
    scheduleBuild(path)
  })
}
