// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { globSync, isDynamicPattern } from 'tinyglobby'

/**
 * Resolve watch paths, expanding glob patterns into concrete file paths.
 *
 * @param watchPaths The watch paths to resolve (may include glob patterns).
 * @param cwd The current working directory to resolve paths relative to.
 * @returns An array of resolved paths. Non-glob paths are returned as-is,
 * while glob patterns are expanded to absolute paths of matching files.
 */
export function resolveWatchPaths(watchPaths: string[], cwd: string): string[] {
  const resolvedWatchPaths: string[] = []
  for (const watchPath of watchPaths) {
    if (isDynamicPattern(watchPath)) {
      // This is a glob pattern; resolve files that match the pattern
      const paths = globSync(watchPath, {
        // Watch paths are resolved relative to the provided cwd
        cwd,
        // Resolve to absolute paths
        absolute: true
      })
      resolvedWatchPaths.push(...paths)
    } else {
      // This is regular file or directory path; let chokidar resolve it
      resolvedWatchPaths.push(watchPath)
    }
  }
  return resolvedWatchPaths
}
