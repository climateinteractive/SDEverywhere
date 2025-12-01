// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdir, readdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import chokidar from 'chokidar'
import type { Plugin } from 'vite'

import type { BundleLocation } from '@sdeverywhere/check-ui-shell'

/**
 * Vite plugin that provides a bridge to the model-check report app to allow access
 * to the local bundles directory when running in local development mode.
 *
 * This plugin adds an HMR (Hot Module Replacement) event handler that listens for
 * 'list-bundles' and 'download-bundle' events from the client.
 *
 * @param bundlesDir The absolute path to the bundles directory.
 */
export function localBundlesPlugin(bundlesDir: string): Plugin {
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

      watcher.on('all', (event, path) => {
        console.log(`[sde-local-bundles] Detected ${event} in bundles directory: ${path}`)
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
          console.log(`[sde-local-bundles] Downloading bundle: ${name} from ${url}`)
          const filePath = await downloadBundle(url, name, lastModified, bundlesDir)

          // Send success message back to client
          console.log(`[sde-local-bundles] Downloaded bundle to: ${filePath}`)
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
          console.log(`[sde-local-bundles] Copying bundle: ${name} to ${newName}`)
          const filePath = await copyBundle(url, newName, bundlesDir)

          // Send success message back to client
          console.log(`[sde-local-bundles] Copied bundle to: ${filePath}`)
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
    const fullPath = join(dir, entry.name)
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

/**
 * Download a bundle from a remote URL and save it to the local bundles directory.
 *
 * @param url The remote URL to download the bundle from.
 * @param name The bundle name (may contain slashes for subdirectories).
 * @param lastModified The last modified timestamp from the remote bundle.
 * @param bundlesDir The bundles directory path.
 * @returns The file path where the bundle was saved.
 */
async function downloadBundle(
  url: string,
  name: string,
  lastModified: string | undefined,
  bundlesDir: string
): Promise<string> {
  // Fetch the bundle from the remote URL
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const bundleContent = await response.text()

  // Preserve slashes in the bundle name (create subdirectories as needed)
  const nameParts = name.split('/')
  const filePath = join(bundlesDir, ...nameParts) + '.js'

  // Create parent directories if they don't exist
  await mkdir(dirname(filePath), { recursive: true })

  // Write the bundle to the local directory
  await writeFile(filePath, bundleContent, 'utf8')

  // Preserve the last modified time from the remote bundle
  if (lastModified) {
    const mtime = new Date(lastModified)
    await utimes(filePath, mtime, mtime)
  }

  return filePath
}

/**
 * Copy a bundle from a source URL and save it with a new name to the local bundles directory.
 *
 * @param url The source URL to copy the bundle from (can be 'current' or file:// URLs).
 * @param newName The new bundle name (may contain slashes for subdirectories).
 * @param bundlesDir The bundles directory path.
 * @returns The file path where the bundle was saved.
 */
async function copyBundle(url: string, newName: string, bundlesDir: string): Promise<string> {
  let srcPath: string
  if (url === 'current') {
    // The "current" bundle is in the sde-prep directory (check-bundle.js)
    const sdePrepDir = join(bundlesDir, '..', 'sde-prep')
    srcPath = join(sdePrepDir, 'check-bundle.js')
  } else if (url.startsWith('file://')) {
    // For file:// URLs, extract the file path
    srcPath = new URL(url).pathname
  } else {
    throw new Error(`Cannot copy bundle with URL: ${url}`)
  }

  // Read the source file
  const bundleContent = await readFile(srcPath, 'utf8')

  // Get the last modified time of the source file
  const stats = await stat(srcPath)
  const sourceLastModified = stats.mtime

  // Preserve slashes in the bundle name (create subdirectories)
  const nameParts = newName.split('/')
  const filePath = join(bundlesDir, ...nameParts) + '.js'

  // Create parent directories if they don't exist
  await mkdir(dirname(filePath), { recursive: true })

  // Write the bundle to the local directory with the new name
  await writeFile(filePath, bundleContent, 'utf8')

  // Preserve the last modified time from the source bundle
  if (sourceLastModified) {
    await utimes(filePath, sourceLastModified, sourceLastModified)
  }

  return filePath
}
