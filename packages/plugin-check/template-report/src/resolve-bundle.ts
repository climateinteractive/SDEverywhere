// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { Bundle } from '@sdeverywhere/check-core'

import type { BundleMetadata, BundleSide } from './bundle-metadata'
import { clearBundleMetadata } from './bundle-metadata'
import type { BundleResult } from './load-bundle'

/**
 * The functions used by `resolveBundle` to load or create a bundle.
 */
export interface ResolveBundleDeps {
  /** Load a bundle (local or remote) via the Vite dev server. */
  loadBundle: (metadata: BundleMetadata) => Promise<BundleResult | undefined>
  /** Create the "current" bundle that is built into the report app. */
  createCurrentBundle: () => Bundle
}

/**
 * Resolve the bundle to be used for one side of the comparison.
 *
 * If the given metadata refers to a local or remote bundle, that bundle will be loaded
 * via the Vite dev server.  If it cannot be loaded, the saved selection is cleared (so
 * that we don't try and fail to load the same bundle every time the app is reloaded)
 * and the "current" bundle is used instead.
 *
 * @param side The side of the comparison.
 * @param metadata The metadata for the selected bundle, or undefined if no bundle was selected.
 * @param deps The functions used to load or create a bundle.
 * @returns The resolved bundle along with its name and URL.
 */
export async function resolveBundle(
  side: BundleSide,
  metadata: BundleMetadata | undefined,
  deps: ResolveBundleDeps
): Promise<BundleResult> {
  if (metadata && (metadata.url.startsWith('http') || metadata.url.startsWith('file://'))) {
    // Load the bundle (either local or remote) via the Vite dev server
    let failure: string
    try {
      console.log(`Loading bundle for ${side} side: name=${metadata.name} url=${metadata.url}`)
      const result = await deps.loadBundle(metadata)
      if (result) {
        return result
      }
      failure = `ERROR: Failed to load bundle ${metadata.name}; will use "current" bundle instead`
    } catch (e) {
      failure = `ERROR: Failed to load bundle from ${metadata.url}; will use "current" bundle instead. Cause: ${e}`
    }

    // Forget the failed selection, otherwise we would try (and fail) to load the same
    // bundle each time the app is reloaded
    console.error(failure)
    clearBundleMetadata(side)
  }

  // Use the "current" bundle if it was requested or if the load above failed
  console.log(`Loading current bundle for ${side} side`)
  return {
    bundle: deps.createCurrentBundle(),
    bundleName: 'current',
    bundleUrl: 'current'
  }
}
