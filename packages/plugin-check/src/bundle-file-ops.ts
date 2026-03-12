// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join as joinPath } from 'node:path'

/**
 * Download a bundle from a remote URL and save it to the local bundles directory.
 *
 * @param url The remote URL to download the bundle from.
 * @param name The bundle name (may contain slashes for subdirectories).
 * @param lastModified The last modified timestamp from the remote bundle.
 * @param bundlesDir The bundles directory path.
 * @param fetchRemoteBundle Optional custom function for fetching remote bundle files.
 * @returns The file path where the bundle was saved.
 */
export async function downloadBundle(
  url: string,
  name: string,
  lastModified: string | undefined,
  bundlesDir: string,
  fetchRemoteBundle?: (url: string) => Promise<string>
): Promise<string> {
  // Add cache busting parameter to avoid issues with servers that aggressively cache files
  const fullUrl = `${url}?cb=${Date.now()}`

  // Fetch the bundle source code from the remote URL
  let bundleContent: string
  if (fetchRemoteBundle) {
    // Use the custom loader function
    bundleContent = await fetchRemoteBundle(fullUrl)
  } else {
    // Use the default fetch implementation
    const response = await fetch(fullUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch bundle: HTTP ${response.status} ${response.statusText}`)
    }
    bundleContent = await response.text()
  }

  // Preserve slashes in the bundle name (create subdirectories as needed)
  const nameParts = name.split('/')
  const filePath = joinPath(bundlesDir, ...nameParts) + '.js'

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
export async function copyBundle(url: string, newName: string, bundlesDir: string): Promise<string> {
  let srcPath: string
  if (url === 'current') {
    // The "current" bundle is in the sde-prep directory (check-bundle.js)
    const sdePrepDir = joinPath(bundlesDir, '..', 'sde-prep')
    srcPath = joinPath(sdePrepDir, 'check-bundle.js')
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
  const filePath = joinPath(bundlesDir, ...nameParts) + '.js'

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
