// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { BundleLocation, BundleSpec } from './bundle-spec'

/**
 * Configuration options for the BundleManager.
 */
export interface BundleManagerConfig {
  /**
   * Optional URL to a JSON file containing the list of remote bundles.
   */
  remoteBundlesUrl?: string

  /**
   * Optional callback to get the list of locally available bundles.
   */
  getLocalBundles?: () => Promise<BundleLocation[]>

  /**
   * Optional callback to download a bundle from the network to local storage.
   */
  onDownloadBundle?: (bundle: BundleSpec) => void
}

/**
 * Manages the state of remote and local bundles.
 *
 * This class handles loading bundles from remote and local sources, merging them,
 * and providing reactive state that components can subscribe to.
 */
export class BundleManager {
  /**
   * Reactive state of all available bundles (merged from remote and local).
   */
  public bundles = $state<BundleSpec[]>([])

  /**
   * Reactive state indicating whether bundles are currently being loaded.
   */
  public loading = $state<boolean>(false)

  /**
   * Reactive state containing any error message from the last load operation.
   */
  public error = $state<string | undefined>(undefined)

  constructor(private readonly config: BundleManagerConfig) {}

  /**
   * Load (or reload) bundles from remote and local sources.
   */
  async load(): Promise<void> {
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
    const merged = this.mergeBundles(remoteBundles || [], localBundles || [])
    this.bundles = merged
    this.loading = false
  }

  /**
   * Download a bundle from the network to local storage.
   *
   * @param bundle The bundle to download.
   */
  downloadBundle(bundle: BundleSpec): void {
    if (this.config.onDownloadBundle) {
      this.config.onDownloadBundle(bundle)
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
    const bundleMap = new Map<string, BundleSpec>()

    // Add remote bundles
    for (const remote of remoteBundles) {
      bundleMap.set(remote.name, { remote })
    }

    // Add or merge local bundles
    for (const local of localBundles) {
      const existing = bundleMap.get(local.name)
      if (existing) {
        existing.local = local
      } else {
        bundleMap.set(local.name, { local })
      }
    }

    return Array.from(bundleMap.values())
  }
}
