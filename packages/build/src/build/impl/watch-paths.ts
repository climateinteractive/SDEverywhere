// Copyright (c) 2025 Climate Interactive / New Venture Fund

import chokidar from 'chokidar'
import { globSync, isDynamicPattern } from 'tinyglobby'

/**
 * Resolve watch paths, expanding glob patterns into concrete file paths.
 *
 * This function doesn't attempt to expand directories.  This is intentional
 * as it allows chokidar to handle directory changes (added and removed files)
 * instead of it being passed a specific set of files when the watch is first
 * set up.
 *
 * @param patterns The watch paths to resolve (may include glob patterns).
 * @param cwd The current working directory to resolve paths relative to.
 * @returns An array of resolved paths. Non-glob paths are returned as-is,
 * while glob patterns are expanded to absolute paths of matching files.
 */
export function resolveWatchPaths(patterns: string[], cwd: string): string[] {
  const resolvedPaths: string[] = []

  // Separate regular file/directory paths from glob patterns
  const regularPaths: string[] = []
  const globPatterns: string[] = []
  for (const pattern of patterns) {
    if (isDynamicPattern(pattern)) {
      globPatterns.push(pattern)
    } else {
      regularPaths.push(pattern)
    }
  }

  // Add the regular paths as is (don't attempt to expand directories)
  resolvedPaths.push(...regularPaths)

  // Resolve the glob patterns; we pass these to tinyglobby all at once so that
  // it can handle negation involving multiple patterns
  if (globPatterns.length > 0) {
    const paths = globSync(globPatterns, {
      // Watch paths are resolved relative to the provided cwd
      cwd,
      // Resolve to absolute paths
      absolute: true
    })
    resolvedPaths.push(...paths)
  }

  return resolvedPaths
}

/**
 * Watch file paths and invoke callbacks when files are changed, added, or removed.
 *
 * This function sets up a file watcher using chokidar. Glob patterns in the paths
 * are resolved before being passed to chokidar (since chokidar no longer supports
 * glob patterns).
 *
 * @param patterns The paths to watch (may include glob patterns).
 * @param cwd The current working directory to resolve paths relative to.
 * @param onChange Callback invoked when a file is changed.
 * @returns A cleanup function that closes the watcher.
 */
export function watchPaths(patterns: string[], cwd: string, onChange: (path: string) => void): () => void {
  // The chokidar package no longer supports glob patterns, so we need to resolve
  // glob patterns first and then pass the resolved paths to chokidar
  const resolvedPathsToWatch = resolveWatchPaths(patterns, cwd)

  // Watch the resolved paths; if changes are detected, invoke the callbacks
  const watcher = chokidar.watch(resolvedPathsToWatch, {
    // Watch paths are resolved relative to the provided cwd
    cwd,
    // Include a delay, otherwise on macOS we sometimes get multiple
    // change events when the file is saved just once
    awaitWriteFinish: {
      stabilityThreshold: 200
    }
  })

  watcher.on('change', path => {
    onChange(path)
  })
  // watcher.on('add', path => {
  //   onChange(path)
  // })
  // watcher.on('unlink', path => {
  //   onChange(path)
  // })

  // Return cleanup function
  return () => {
    watcher.close()
  }
}
