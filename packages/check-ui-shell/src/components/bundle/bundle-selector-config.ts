// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { BundleLocation, BundleSpec } from './bundle-spec'

/**
 * Configuration options for the `BundleSelector` component.
 */
export interface BundleSelectorConfig {
  /**
   * The URL of the initial "left" bundle.
   */
  bundleUrlL?: string

  /**
   * The URL of the initial "right" bundle.
   */
  bundleUrlR?: string

  /**
   * Optional URL to a JSON file containing the list of remote bundles.
   *
   * The URL should point to a JSON file that contains an array of `BundleLocation` objects.
   */
  remoteBundlesUrl?: string

  /**
   * Get the list of locally available bundles.
   *
   * This function is invoked when the bundle selector is initialized to fetch the list of bundles
   * that are available in the local bundles directory.
   *
   * @returns A promise that resolves to an array of bundle locations.
   */
  getLocalBundles?: () => Promise<BundleLocation[]>

  /**
   * Download a remote bundle from the network to the local bundles directory.
   *
   * This function is invoked when the user clicks the download button for a bundle in the bundle selector.
   * The implementation should fetch the bundle's JS file from the remote URL and save it to the local
   * bundles directory.
   *
   * @param bundle The bundle to download.
   */
  onDownloadBundle?: (bundle: BundleSpec) => void

  /**
   * Copy a local bundle file to a new name.
   *
   * This function is invoked when the user clicks the copy button for a bundle in the bundle selector.
   * The implementation should copy the bundle file to the local bundle directory with the new name.
   *
   * @param bundle The bundle to copy.
   * @param newName The new name for the copied bundle.
   */
  onCopyBundle?: (bundle: BundleSpec, newName: string) => void

  /**
   * Add a listener that is notified when there are file system changes detected in the
   * local bundles directory.
   *
   * This function is invoked when the bundle selector is initialized.  The implementation should
   * register the given listener function, which will be invoked when there are file system changes.
   *
   * @param listener The function to invoke when there are file system changes detected in the
   * local bundles directory.
   */
  onBundlesChanged?: (listener: () => void) => void
}
