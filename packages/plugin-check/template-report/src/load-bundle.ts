// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { Bundle } from '@sdeverywhere/check-core'

export interface BundleMetadata {
  name: string
  url: string
}

export interface BundleResult {
  bundle: Bundle
  bundleName: string
  bundleUrl: string
}

/**
 * Load a bundle (local or remote) via the Vite dev server (only available in development mode with HMR).
 */
export async function loadBundle(bundleMetadata: BundleMetadata): Promise<BundleResult | undefined> {
  // Only available in development mode with HMR
  if (!import.meta.hot) {
    return undefined
  }

  return new Promise((resolve, reject) => {
    // Set up listeners
    const handleSuccess = async (data: { name: string; url: string; sourceCode: string }) => {
      cleanup()
      if (data.url === bundleMetadata.url) {
        try {
          // Create a blob URL from the source code
          const blob = new Blob([data.sourceCode], { type: 'application/javascript' })
          const blobUrl = URL.createObjectURL(blob)

          // Import the bundle from the blob URL
          const module = await import(/* @vite-ignore */ blobUrl)
          const bundle = module.createBundle() as Bundle

          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl)

          resolve({
            bundle,
            bundleName: bundleMetadata.name,
            bundleUrl: bundleMetadata.url
          })
        } catch (error) {
          console.error(`Failed to create bundle ${bundleMetadata.name}:`, error)
          resolve(undefined)
        }
      }
    }

    const handleError = (data: { name: string; url: string; error: string }) => {
      cleanup()
      if (data.url === bundleMetadata.url) {
        console.error(`Failed to load bundle ${bundleMetadata.name}:`, data.error)
        resolve(undefined)
      }
    }

    const cleanup = () => {
      import.meta.hot.off('load-bundle-success', handleSuccess)
      import.meta.hot.off('load-bundle-error', handleError)
    }

    import.meta.hot.on('load-bundle-success', handleSuccess)
    import.meta.hot.on('load-bundle-error', handleError)

    // Send request to load bundle
    import.meta.hot.send('load-bundle', { url: bundleMetadata.url, name: bundleMetadata.name })

    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for bundle: ${bundleMetadata.name}`))
    }, 10000)
  })
}
