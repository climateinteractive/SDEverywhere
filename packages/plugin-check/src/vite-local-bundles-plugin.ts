// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { readdir, readFile, stat } from 'node:fs/promises'
import { join as joinPath, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
 * @param fetchRemoteBundle Optional function for fetching remote bundle files.
 */
export function localBundlesPlugin(
  bundlesDir: string,
  currentBundlePath: string,
  fetchRemoteBundle?: (url: string) => Promise<string>
): Plugin {
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

      watcher.on('all', (event /*, path*/) => {
        if (event === 'add' || event === 'unlink') {
          // Notify all clients that the bundles list has changed
          // console.log(`[sde-local-bundles] Detected ${event} in bundles directory: ${path}`)
          server.ws.send('bundles-changed', {})
        }
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

      // Handle requests to load a local or remote bundle
      server.ws.on('load-bundle', async (data, client) => {
        const { url, name } = data
        try {
          let sourceCode: string

          if (url.startsWith('file://')) {
            // Local bundle: read from file system
            // console.log(`[sde-local-bundles] Loading local bundle: name=${name} url=${url}`)
            const filePath = fileURLToPath(url)
            sourceCode = await readFile(filePath, 'utf-8')
          } else if (url.startsWith('https://') || url.startsWith('http://')) {
            // Remote bundle: fetch from remote URL
            // console.log(`[sde-local-bundles] Loading remote bundle: name=${name} url=${url}`)
            // Add cache busting parameter to avoid issues with servers that aggressively cache files
            const fullUrl = `${url}?cb=${Date.now()}`
            if (fetchRemoteBundle) {
              // Use the custom fetch function
              sourceCode = await fetchRemoteBundle(fullUrl)
            } else {
              // Use the default fetch implementation
              const response = await fetch(fullUrl)
              if (!response.ok) {
                throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`)
              }
              sourceCode = await response.text()
            }
          } else {
            throw new Error(`Unsupported URL scheme: ${url}`)
          }

          // Send the source code back to client
          client.send('load-bundle-success', { name, url, sourceCode })
        } catch (error) {
          // Send error message back to client
          console.error(`[sde-local-bundles] Failed to load bundle:`, error)
          client.send('load-bundle-error', { name, url, error: error.message })
        }
      })

      // Handle requests to download a bundle to the local bundles directory
      server.ws.on('download-bundle', async (data, client) => {
        const { url, name, lastModified } = data
        try {
          // Download the bundle to the local bundles directory
          console.log(`[sde-local-bundles] Downloading bundle: name=${name} url=${url}`)
          const filePath = await downloadBundle(url, name, lastModified, bundlesDir, fetchRemoteBundle)

          // Send success message back to client
          console.log(`[sde-local-bundles] Downloaded bundle to ${filePath}`)
          client.send('download-bundle-success', { name, filePath: `${name}.js` })
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
