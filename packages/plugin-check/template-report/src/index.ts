// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, ConfigInitOptions, SuiteSummary } from '@sdeverywhere/check-core'

import type { BundleLocation, BundleSpec } from '@sdeverywhere/check-ui-shell'
import { initAppShell } from '@sdeverywhere/check-ui-shell'
import '@sdeverywhere/check-ui-shell/dist/style.css'

import { initOverlay } from './overlay'

import './global.css'

// These aliases are specified in the Vite config to point to the actual bundles
import { createBundle as createBaselineBundle } from '@_baseline_bundle_'
import { createBundle as createCurrentBundle } from '@_current_bundle_'
import { getConfigOptions } from '@_test_config_'

interface BundleMetadata {
  name: string
  url: string
}

function loadBundleMetadata(side: 'left' | 'right'): BundleMetadata | undefined {
  if (import.meta.hot) {
    const metadataJson = localStorage.getItem(`sde-check-selected-bundle-${side}`)
    if (metadataJson) {
      const parsed = JSON.parse(metadataJson)
      if (parsed.name && parsed.url) {
        return parsed as BundleMetadata
      }
    }
  }
  return undefined
}

function saveBundleMetadata(side: 'left' | 'right', metadata: BundleMetadata): void {
  if (import.meta.hot) {
    localStorage.setItem(`sde-check-selected-bundle-${side}`, JSON.stringify(metadata))
  }
}

// For local development mode, use the bundle metadata saved in `LocalStorage`
let savedBundleMetadataL: BundleMetadata | undefined
let savedBundleMetadataR: BundleMetadata | undefined
// The following value will be injected by `vite-config-for-report.ts`
const bundlesPath = './bundles/*.txt'
if (import.meta.hot && bundlesPath) {
  // Restore the previously selected bundles (from before the page was reloaded)
  savedBundleMetadataL = loadBundleMetadata('left')
  savedBundleMetadataR = loadBundleMetadata('right')
}

async function initForProduction(): Promise<void> {
  // For "production" builds, load the summary from a JSON file that
  // was generated as part of the build process.  This makes the
  // report load almost immediately instead of running all the checks
  // in the user's browser.
  const suiteSummaryJson = __SUITE_SUMMARY_JSON__
  let suiteSummary: SuiteSummary
  if (suiteSummaryJson) {
    suiteSummary = JSON.parse(suiteSummaryJson) as SuiteSummary
  }

  // Load the bundles used by the model check/compare configuration.  We
  // always initialize the "current" bundle.
  const bundleR: Bundle = createCurrentBundle()

  // Only initialize the "baseline" bundle if it is defined and the version
  // is the same as the "current" one.  If the baseline bundle has a different
  // version, we will skip the comparison tests and only run the checks on the
  // current bundle.
  let bundleL: Bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBundleL: any = createBaselineBundle()
  if (rawBundleL.version === bundleR.version) {
    bundleL = rawBundleL as Bundle
  }

  // Prepare the model check/comparison configuration
  const configInitOptions: ConfigInitOptions = {
    bundleNameL: __BASELINE_NAME__ || undefined,
    bundleNameR: __CURRENT_NAME__
  }
  const configOptions = await getConfigOptions(bundleL, bundleR, configInitOptions)

  // Initialize the root Svelte component
  initAppShell(configOptions, {
    suiteSummary
  })
}

async function initForLocal(): Promise<void> {
  async function createBundle(bundleMetadata: BundleMetadata | undefined): Promise<[Bundle, string]> {
    if (bundleMetadata === undefined) {
      bundleMetadata = {
        name: 'current',
        url: 'current'
      }
    }

    let bundle: Bundle
    let bundleName: string
    if (bundleMetadata.url === 'current') {
      // Load the "current" bundle
      bundle = createCurrentBundle()
      bundleName = 'current'
    } else {
      // Load the local or remote bundle using dynamic import
      try {
        // Note that we use `@vite-ignore` since we want to bypass Vite's dynamic import checks
        const module = await import(/* @vite-ignore */ bundleMetadata.url)
        bundle = module.createBundle() as Bundle
        bundleName = bundleMetadata.name
      } catch (e) {
        console.error(
          `ERROR: Failed to load bundle from ${bundleMetadata.url}; will use "current" bundle instead. Cause: ${e.message}`
        )
        bundle = createCurrentBundle()
        bundleName = 'current'
      }
    }
    return [bundle, bundleName]
  }

  const [bundleL, bundleNameL] = await createBundle(savedBundleMetadataL)
  const [bundleR, bundleNameR] = await createBundle(savedBundleMetadataR)

  // Prepare the model check/comparison configuration
  const configInitOptions: ConfigInitOptions = {
    bundleNameL,
    bundleNameR
  }
  const configOptions = await getConfigOptions(bundleL, bundleR, configInitOptions)

  // Override the concurrency setting using the value from LocalStorage
  const concurrencyValue = localStorage.getItem('sde-check-concurrency')
  if (concurrencyValue !== null) {
    const concurrency = parseInt(concurrencyValue)
    configOptions.concurrency = !isNaN(concurrency) ? concurrency : 1
  } else {
    configOptions.concurrency = 1
  }

  // Initialize the root Svelte component
  initAppShell(configOptions, {
    getLocalBundles: import.meta.hot ? getLocalBundles : undefined,
    onDownloadBundle: import.meta.hot ? onDownloadBundle : undefined
  })
}

async function initBundlesAndUI() {
  // Before switching bundles, clear out the app-shell-container element
  const container = document.getElementById('app-shell-container')
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  // TODO: Release resources associated with active bundles

  // Prepare options differently if in local development mode
  if (import.meta.hot) {
    await initForLocal()
  } else {
    await initForProduction()
  }
}

// Initialize the overlay element used to show builder messages/errors
initOverlay()

// Initialize the bundles and user interface
initBundlesAndUI()

if (import.meta.hot) {
  // Reload everything when the user chooses a new baseline or current bundle
  document.addEventListener('sde-check-bundle', e => {
    // Change the selected bundle
    const info = (e as CustomEvent).detail
    const bundleMetadata = { name: info.name, url: info.url }
    if (info.side === 'left') {
      saveBundleMetadata('left', bundleMetadata)
      savedBundleMetadataL = bundleMetadata
    } else if (info.side === 'right') {
      saveBundleMetadata('right', bundleMetadata)
      savedBundleMetadataR = bundleMetadata
    }

    // Reinitialize using the chosen bundles
    initBundlesAndUI()
  })

  // Reload everything when the user applies updated configuration (e.g., updated filters or
  // concurrency setting)
  document.addEventListener('sde-check-config-changed', () => {
    // Reinitialize using the new configuration
    initBundlesAndUI()
  })
}

/**
 * Get the list of locally available bundles (only in development mode with HMR enbaled).
 */
async function getLocalBundles(): Promise<BundleLocation[]> {
  // Only available in development mode with HMR
  if (!import.meta.hot) {
    throw new Error('getLocalBundles is only available in development mode with HMR enabled')
  }

  return new Promise((resolve, reject) => {
    // Set up listeners
    const handleSuccess = (data: { bundles: Array<{ name: string; url: string; lastModified: string }> }) => {
      cleanup()
      const bundles: BundleLocation[] = data.bundles.map(b => ({
        name: b.name,
        url: b.url,
        lastModified: b.lastModified
      }))
      resolve(bundles)
    }

    const handleError = (data: { error: string }) => {
      cleanup()
      reject(new Error(data.error))
    }

    const cleanup = () => {
      import.meta.hot.off('list-bundles-success', handleSuccess)
      import.meta.hot.off('list-bundles-error', handleError)
    }

    import.meta.hot.on('list-bundles-success', handleSuccess)
    import.meta.hot.on('list-bundles-error', handleError)

    // Send request to list bundles
    import.meta.hot.send('list-bundles', {})

    // Timeout after 5 seconds
    setTimeout(() => {
      cleanup()
      reject(new Error('Timeout waiting for bundle list'))
    }, 5000)
  })
}

/**
 * Download a bundle from the network (only in development mode with HMR).
 */
function onDownloadBundle(bundle: BundleSpec): void {
  // Only available in development mode with HMR
  if (!import.meta.hot) {
    throw new Error('onDownloadBundle is only available in development mode with HMR enabled')
  }

  if (!bundle.remote) {
    throw new Error('Only bundles with a remote URL can be downloaded')
  }

  const { url, name } = bundle.remote

  // Set up listeners for download result
  const handleSuccess = (data: { name: string; filePath: string }) => {
    cleanup()
    if (data.name === name) {
      console.log(`Successfully downloaded bundle: ${name} to ${data.filePath}`)
      // TODO: Optionally refresh the bundle selector UI
    }
  }

  const handleError = (data: { name: string; error: string }) => {
    cleanup()
    if (data.name === name) {
      console.error(`Failed to download bundle ${name}:`, data.error)
    }
  }

  const cleanup = () => {
    import.meta.hot.off('download-bundle-success', handleSuccess)
    import.meta.hot.off('download-bundle-error', handleError)
  }

  import.meta.hot.on('download-bundle-success', handleSuccess)
  import.meta.hot.on('download-bundle-error', handleError)

  // Send download request
  import.meta.hot.send('download-bundle', { url, name })

  console.log(`Requesting download of bundle: ${name} from ${url}`)
}
