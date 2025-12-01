// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { BundleSelectorConfig } from './bundle-selector-config'
import type { BundleLocation, BundleSpec } from './bundle-spec'

/**
 * Manages the state of remote and local bundles.
 *
 * This class handles loading bundles from remote and local sources, merging them,
 * and providing reactive state that components can subscribe to.
 */
export class BundleManager {
  /** The URL of the active "left" bundle. */
  public readonly activeBundleUrlL: string

  /** The URL of the active "right" bundle. */
  public readonly activeBundleUrlR: string

  /** Reactive state of all available bundles (merged from remote and local). */
  public bundles = $state<BundleSpec[]>([])

  /** Reactive state indicating whether bundles are currently being loaded. */
  public loading = $state<boolean>(false)

  /** Reactive state containing any error message from the last load operation. */
  public error = $state<string | undefined>(undefined)

  constructor(public readonly config: BundleSelectorConfig) {
    this.activeBundleUrlL = config.bundleUrlL || ''
    this.activeBundleUrlR = config.bundleUrlR || ''

    // Reload the selector automatically when `bundles-changed` events are received
    if (this.config.onBundlesChanged) {
      this.config.onBundlesChanged(() => {
        this.load()
      })
    }
  }

  /**
   * Load (or reload) bundles from remote and local sources.
   */
  public async load(): Promise<void> {
    this.loading = true
    this.error = undefined

    const remoteBundlesPromise = this.loadRemoteBundles()
    const localBundlesPromise = this.loadLocalBundles()

    const [remoteBundles, localBundles] = await Promise.all([remoteBundlesPromise, localBundlesPromise])

    // Check if both sources failed
    if (!remoteBundles && !localBundles) {
      if (!this.config.remoteBundlesUrl && !this.config.getLocalBundles) {
        this.error = 'No bundles available'
      } else {
        // Check if a specific error was already set
        if (!this.error) {
          this.error = 'Failed to load bundles'
        }
      }
      this.bundles = []
      this.loading = false
      return
    }

    // Merge remote and local bundles
    this.bundles = this.mergeBundles(remoteBundles || [], localBundles || [])
    this.loading = false
  }

  /**
   * Download a remote bundle from the network to the local bundles directory.
   *
   * @param bundle The bundle to download.
   */
  public downloadBundle(bundle: BundleSpec): void {
    if (this.config.onDownloadBundle) {
      this.config.onDownloadBundle(bundle)
    }
  }

  /**
   * Copy a local bundle file to a new name.
   */
  public copyBundle(bundle: BundleSpec, newName: string): void {
    if (this.config.onCopyBundle) {
      // Replace spaces with dashes (but preserve slashes)
      const sanitizedName = newName.replace(/\s/g, '-')
      this.config.onCopyBundle(bundle, sanitizedName)
    }
  }

  /**
   * Load bundles from the remote metadata URL.
   */
  private async loadRemoteBundles(): Promise<BundleLocation[] | undefined> {
    if (!this.config.remoteBundlesUrl) {
      return undefined
    }

    try {
      const response = await fetch(this.config.remoteBundlesUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch remote bundles: ${response.statusText}`)
      }
      const data = await response.json()
      return data as BundleLocation[]
    } catch (err) {
      const detailMessage = err instanceof Error ? err.message : String(err)
      const message = `Failed to load remote bundles: ${detailMessage}`
      const currentError = this.error
      if (currentError) {
        this.error = `${currentError}; ${message}`
      } else {
        this.error = message
      }
      return undefined
    }
  }

  /**
   * Load bundles from the local storage.
   */
  private async loadLocalBundles(): Promise<BundleLocation[] | undefined> {
    if (!this.config.getLocalBundles) {
      return undefined
    }

    try {
      return await this.config.getLocalBundles()
    } catch (err) {
      const detailMessage = err instanceof Error ? err.message : String(err)
      const message = `Failed to load local bundles: ${detailMessage}`
      const currentError = this.error
      if (currentError) {
        this.error = `${currentError}; ${message}`
      } else {
        this.error = message
      }
      return undefined
    }
  }

  /**
   * Merge remote and local bundles into a unified list.
   *
   * @param remoteBundles The list of remote bundles.
   * @param localBundles The list of local bundles.
   * @returns The merged list of bundles.
   */
  private mergeBundles(remoteBundles: BundleLocation[], localBundles: BundleLocation[]): BundleSpec[] {
    const bundles: BundleSpec[] = []

    // Add remote bundles
    for (const bundle of remoteBundles) {
      bundles.push({ remote: bundle })
    }

    // Add local bundles
    // TODO: Ideally we would show a single item in the case where the local bundle is a copy of a remote
    // bundle (and is up to date with it), but for now we will show local bundles separately in all cases
    for (const bundle of localBundles) {
      bundles.push({ local: bundle })
    }

    return bundles
  }
}
