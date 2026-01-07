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
 * Load a remote bundle from a given URL.
 */
export async function loadRemoteBundle(bundleMetadata: BundleMetadata): Promise<BundleResult> {
  // Add cache busting parameter
  const cacheBuster = `?cb=${Date.now()}`
  const fullUrl = `${bundleMetadata.url}${cacheBuster}`
  const module = await import(/* @vite-ignore */ fullUrl)
  const bundle = module.createBundle() as Bundle
  return {
    bundle,
    bundleName: bundleMetadata.name,
    bundleUrl: bundleMetadata.url
  }
}

/**
 * Load a local bundle from a given path using `import.meta.glob`.
 */
export async function loadLocalBundle(bundleMetadata: BundleMetadata): Promise<BundleResult | undefined> {
  // Helper function to extract the relative path after the rightmost '/bundles/' or '\bundles\'
  const extractBundleRelPath = (path: string): string | undefined => {
    // Normalize path separators to forward slashes for consistent searching
    const normalizedPath = path.replace(/\\/g, '/')
    // Find the rightmost occurrence of '/bundles/'
    const bundlesIndex = normalizedPath.lastIndexOf('/bundles/')
    if (bundlesIndex === -1) {
      return undefined
    }
    // Return everything after '/bundles/'
    return normalizedPath.substring(bundlesIndex + '/bundles/'.length)
  }

  // Load local bundles using `import.meta.glob` (since dynamic import isn't
  // available for file URLs due to security restrictions).  The glob pattern
  // part will be replaced by Vite (see `vite-config-for-report.ts`).  Note
  // that we provide a placeholder here that looks like a valid glob pattern,
  // since Vite's dependency resolver will report errors if it is invalid
  // (not a literal).
  const bundlesGlob = import.meta.glob('./bundles/**/*.txt', {
    eager: false
  })

  // The bundle name may contain slashes (e.g., 'feature/remote-1'), so we need to
  // match the full relative path, not just the filename.  The `url` value will
  // be a 'file://' URL that has the absolute path the bundle file.
  const targetBundleRelPath = extractBundleRelPath(bundleMetadata.url)
  if (targetBundleRelPath) {
    // TODO!!!!! REMOVE LOGGING!!!!
    console.log('bundlesGlob', Object.keys(bundlesGlob))
    console.log('target', bundleMetadata)
    const bundleKey = Object.keys(bundlesGlob).find(key => {
      // The key here is a relative path the bundle file, e.g., '../../bundles/feature/remote-1.js'.
      // We will extract the relative path after the '.../bundles' part for comparing to the target
      // bundle path.
      const bundleRelPath = extractBundleRelPath(key)
      return bundleRelPath === targetBundleRelPath
    })

    if (bundleKey) {
      type BundleModule = {
        createBundle(): Bundle
      }
      const loadBundle = bundlesGlob[bundleKey]
      const module = (await loadBundle()) as BundleModule
      const bundle = module.createBundle() as Bundle
      return {
        bundle,
        bundleName: bundleMetadata.name,
        bundleUrl: bundleMetadata.url
      }
    }
  }

  return undefined
}
