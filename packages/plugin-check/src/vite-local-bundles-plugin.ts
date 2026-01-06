// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { readdir, stat } from 'node:fs/promises'
import { join as joinPath, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import chokidar from 'chokidar'
import type { Plugin } from 'vite'

import type { BundleLocation } from '@sdeverywhere/check-ui-shell'
import { copyBundle, downloadBundle } from './bundle-file-ops'

/**
 * Vite plugin that provides a bridge to the model-check report app to allow access
 * to the local bundles directory when running in local development mode.
 *
 * This plugin adds an HMR (Hot Module Replacement) event handler that listens for
 * 'list-bundles' and 'download-bundle' events from the client.
 *
 * @param bundlesDir The absolute path to the bundles directory.
 * @param currentBundlePath The absolute path to the current bundle file.
 */
export function localBundlesPlugin(bundlesDir: string, currentBundlePath: string): Plugin {
  return {
    name: 'sde-local-bundles',

    configureServer(server) {
      // Watch the bundles directory for changes and notify clients
      const watcher = chokidar.watch(bundlesDir, {
        // Don't send initial "file added" events
        ignoreInitial: true,
        // XXX: Include a delay, otherwise on macOS we sometimes get multiple
        // change events when a file is saved just once
        awaitWriteFinish: {
          stabilityThreshold: 200
        },
        // Watch up to 10 levels deep
        depth: 10
      })

      watcher.on('all', (/*event, path*/) => {
        // console.log(`[sde-local-bundles] Detected ${event} in bundles directory: ${path}`)
        // Notify all clients that the bundles list has changed
        server.ws.send('bundles-changed', {})
      })

      // Clean up the file watcher when the vite server is closed
      server.httpServer?.on('close', () => {
        watcher.close()
      })

      // Handle requests to list the available local bundles
      server.ws.on('list-bundles', async (_, client) => {
        try {
          // Find all bundles in the local bundles directory
          const bundles = await scanBundlesRecursively(bundlesDir, bundlesDir)

          // Add the special "current" bundle with its up-to-date last modified time
          const currentBundleStats = await stat(currentBundlePath)
          bundles.push({
            name: 'current',
            url: 'current',
            lastModified: currentBundleStats.mtime.toISOString()
          })

          // Send success message back to client
          client.send('list-bundles-success', { bundles })
        } catch (error) {
          // Send error message back to client
          console.error(`[sde-local-bundles] Failed to list bundles:`, error)
          client.send('list-bundles-error', { error: error.message })
        }
      })

      // Handle requests to download a bundle to the local bundles directory
      server.ws.on('download-bundle', async (data, client) => {
        const { url, name, lastModified } = data
        try {
          // Download the bundle to the local bundles directory
          console.log(`[sde-local-bundles] Downloading bundle: name=${name} url=${url}`)
          const filePath = await downloadBundle(url, name, lastModified, bundlesDir)

          // Send success message back to client
          console.log(`[sde-local-bundles] Downloaded bundle to ${filePath}`)
          client.send('download-bundle-success', { name, filePath: `${name}.js` })

          // XXX: Reload the server so that the new bundle is available via `import.meta.glob`.
          // This is a workaround for the fact that `import.meta.glob` does not rescan after
          // changes are made to the bundles directory.  The problem with this is that it will
          // cause the page to reload and the user will lose their place in the UI.
          server.restart()
        } catch (error) {
          // Send error message back to client
          console.error(`[sde-local-bundles] Failed to download bundle:`, error)
          client.send('download-bundle-error', { name, error: error.message })
        }
      })

      // Handle requests to copy a bundle to a new name
      server.ws.on('copy-bundle', async (data, client) => {
        const { url, name, newName } = data
        try {
          // Copy the bundle with a new name
          console.log(`[sde-local-bundles] Copying bundle: src=${name} dst=${newName}`)
          const filePath = await copyBundle(url, newName, bundlesDir)

          // Send success message back to client
          console.log(`[sde-local-bundles] Copied bundle to ${filePath}`)
          client.send('copy-bundle-success', { name: newName, filePath: `${newName}.js` })

          // XXX: Reload the server so that the new bundle is available via `import.meta.glob`.
          // This is a workaround for the fact that `import.meta.glob` does not rescan after
          // changes are made to the bundles directory.  The problem with this is that it will
          // cause the page to reload and the user will lose their place in the UI.
          server.restart()
        } catch (error) {
          // Send error message back to client
          console.error(`[sde-local-bundles] Failed to copy bundle:`, error)
          client.send('copy-bundle-error', { name, error: error.message })
        }
      })
    }
  }
}

/**
 * Recursively scan a directory for .js files.
 *
 * @param dir The directory to scan.
 * @param baseDir The base directory (used for calculating relative paths).
 * @returns An array of bundle information.
 */
async function scanBundlesRecursively(dir: string, baseDir: string): Promise<BundleLocation[]> {
  const bundles: BundleLocation[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = joinPath(dir, entry.name)
    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      const subBundles = await scanBundlesRecursively(fullPath, baseDir)
      bundles.push(...subBundles)
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const stats = await stat(fullPath)
      // Get the relative path from baseDir and remove the .js extension
      const relativePath = relative(baseDir, fullPath)
      const name = relativePath.replace(/\.js$/, '').split(sep).join('/')
      bundles.push({
        name,
        url: pathToFileURL(fullPath).toString(),
        lastModified: stats.mtime.toISOString()
      })
    }
  }

  return bundles
}
