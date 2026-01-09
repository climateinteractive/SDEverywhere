// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { globSync, isDynamicPattern } from 'tinyglobby'

/**
 * Resolve watch paths, expanding glob patterns into concrete file paths.
 *
 * This function doesn't attempt to expand directories.  This is intentional
 * as it allows chokidar to handle directory changes (added and removed files)
 * instead of it being passed a specific set of files when the watch is first
 * set up.
 *
 * @param watchPaths The watch paths to resolve (may include glob patterns).
 * @param cwd The current working directory to resolve paths relative to.
 * @returns An array of resolved paths. Non-glob paths are returned as-is,
 * while glob patterns are expanded to absolute paths of matching files.
 */
export function resolveWatchPaths(watchPaths: string[], cwd: string): string[] {
  const resolvedWatchPaths: string[] = []

  // Separate regular file/directory paths from glob patterns
  const regularPaths: string[] = []
  const globPatterns: string[] = []
  for (const watchPath of watchPaths) {
    if (isDynamicPattern(watchPath)) {
      globPatterns.push(watchPath)
    } else {
      regularPaths.push(watchPath)
    }
  }

  // Add the regular paths as is (don't attempt to expand directories)
  resolvedWatchPaths.push(...regularPaths)

  // Resolve the glob patterns; we pass these to tinyglobby all at once so that
  // it can handle negation involving multiple patterns
  if (globPatterns.length > 0) {
    const paths = globSync(globPatterns, {
      // Watch paths are resolved relative to the provided cwd
      cwd,
      // Resolve to absolute paths
      absolute: true
    })
    resolvedWatchPaths.push(...paths)
  }

  return resolvedWatchPaths
}
