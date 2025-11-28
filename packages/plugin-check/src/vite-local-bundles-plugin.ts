// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { statSync } from 'node:fs'
import { writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

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
    name: 'local-bundles',

    configureServer(server) {
      // Handle requests to list the available local bundles
      server.ws.on('list-bundles', async (_, client) => {
        try {
          const files = await readdir(bundlesDir)
          const bundles = files
            .filter(file => file.endsWith('.js'))
            .map(file => {
              const filePath = join(bundlesDir, file)
              const stats = statSync(filePath)
              return {
                name: file.replace(/\.js$/, ''),
                url: pathToFileURL(filePath).toString(),
                lastModified: stats.mtime.toISOString()
              }
            })

          client.send('list-bundles-success', { bundles })
        } catch (error) {
          console.error(`[local-bundles] Failed to list bundles:`, error)
          client.send('list-bundles-error', { error: error.message })
        }
      })

      // Handle requests to download a bundle to the local bundles directory
      server.ws.on('download-bundle', async (data, client) => {
        const { url, name } = data

        try {
          console.log(`[local-bundles] Downloading bundle: ${name} from ${url}`)

          // Fetch the bundle from the remote URL
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const bundleContent = await response.text()

          // Write the bundle to the local directory
          const fileName = `${name.replace(/\//g, '-')}.js`
          const filePath = join(bundlesDir, fileName)
          await writeFile(filePath, bundleContent, 'utf8')

          console.log(`[local-bundles] Downloaded bundle to: ${filePath}`)

          // Send success message back to client
          client.send('download-bundle-success', { name, filePath: fileName })
        } catch (error) {
          console.error(`[local-bundles] Failed to download bundle:`, error)

          // Send error message back to client
          client.send('download-bundle-error', {
            name,
            error: error.message
          })
        }
      })
    }
  }
}
