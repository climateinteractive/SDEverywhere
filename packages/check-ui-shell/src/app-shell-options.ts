// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { SuiteSummary } from '@sdeverywhere/check-core'

import type { BundleLocation, BundleSpec } from './components/bundle/bundle-spec'

export interface AppShellOptions {
  /** The ID of the container element that will host the app shell (default is 'app-shell-container'). */
  containerId?: string
  /**
   * An object containing the results of a model-check run.  This is used when generating a report
   * that already has the test results available so that they don't need to be run again when the
   * user opens the report in the browser.
   */
  suiteSummary?: SuiteSummary
  /**
   * Optional URL to a JSON file containing the list of remote bundles.
   *
   * The URL should point to a JSON file that contains an array of `BundleLocation` objects.
   */
  remoteBundlesUrl?: string
  /**
   * Get the list of locally available bundles.
   *
   * This callback is invoked when the bundle selector is opened to fetch the list of bundles
   * that have been downloaded to local storage.
   *
   * @returns A promise that resolves to an array of bundle locations.
   */
  getLocalBundles?: () => Promise<BundleLocation[]>
  /**
   * Download a bundle from the network to local storage.
   *
   * This callback is invoked when the user clicks the download button for a bundle in the bundle selector.
   * The implementation should fetch the bundle's JS file from the remote URL and save it to the local
   * bundle directory.
   *
   * @param bundle The bundle to download.
   */
  onDownloadBundle?: (bundle: BundleSpec) => void
}
