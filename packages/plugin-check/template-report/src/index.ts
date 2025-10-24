// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, ConfigInitOptions, SuiteSummary } from '@sdeverywhere/check-core'

import { initAppShell } from '@sdeverywhere/check-ui-shell'
import '@sdeverywhere/check-ui-shell/dist/style.css'

import { initOverlay } from './overlay'

import './global.css'

// These aliases are specified in the Vite config to point to the actual bundles
import { createBundle as createBaselineBundle } from '@_baseline_bundle_'
import { createBundle as createCurrentBundle } from '@_current_bundle_'
import { getConfigOptions } from '@_test_config_'

function loadBundleName(key: string): string | undefined {
  if (import.meta.hot) {
    return localStorage.getItem(`sde-check-selected-bundle-${key}`)
  } else {
    return undefined
  }
}

function saveBundleName(key: string, value: string): void {
  if (import.meta.hot) {
    localStorage.setItem(`sde-check-selected-bundle-${key}`, value)
  }
}

// For local development mode, load the list of available baseline bundles
type BundleModule = {
  createBundle(): Bundle
}
type LoadBundle = () => Promise<Bundle>
const availableBundles: { [key: string]: LoadBundle } = {}
let bundleNames: string[]
let selectedBaselineBundleName: string
let selectedCurrentBundleName: string
// The following value will be injected by `vite-config-for-report.ts`
const baselinesPath = './baselines/*.txt'
if (import.meta.hot && baselinesPath) {
  // Restore the previously selected bundles (from before the page was reloaded)
  selectedBaselineBundleName = loadBundleName('baseline')
  selectedCurrentBundleName = loadBundleName('current')

  // Get the available baseline bundles.  The glob pattern part will be replaced
  // by Vite (see `vite-config-for-report.ts`).  Note that we provide a placeholder
  // here that looks like a valid glob pattern, since Vite's dependency resolver will
  // report errors if it is invalid (not a literal).
  const bundlesGlob = import.meta.glob('./baselines/*.txt', {
    eager: false
  })
  const baselineBundleNames: string[] = []
  for (const bundleKey of Object.keys(bundlesGlob)) {
    const loadBundle = bundlesGlob[bundleKey]
    const bundlePathParts = bundleKey.split('/')
    const bundleFileName = bundlePathParts[bundlePathParts.length - 1]
    const bundleName = bundleFileName.replace('.js', '')
    baselineBundleNames.push(bundleName)
    availableBundles[bundleName] = async () => {
      const module = (await loadBundle()) as BundleModule
      return module.createBundle() as Bundle
    }
  }

  // Alphabetize (reversed, so that newer dates are at the top of the list)
  baselineBundleNames.sort((a, b) => {
    return b.toLowerCase().localeCompare(a.toLowerCase())
  })

  // Always include the "current" bundle as the first option, followed by
  // the alphabetized bundle names
  bundleNames = ['current', ...baselineBundleNames]
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
  async function createBundle(requestedName: string | undefined): Promise<[Bundle, string]> {
    if (requestedName === undefined) {
      requestedName = 'current'
    }

    // See if there is a bundle available for the requested name
    let bundle: Bundle
    let bundleName: string
    if (requestedName in availableBundles) {
      // Load the bundle for the requested name
      const loadBundle = availableBundles[requestedName]
      bundle = await loadBundle()
      bundleName = requestedName
    } else {
      // Load the "current" bundle
      bundle = createCurrentBundle()
      bundleName = 'current'
    }
    return [bundle, bundleName]
  }

  const [bundleL, bundleNameL] = await createBundle(selectedBaselineBundleName)
  const [bundleR, bundleNameR] = await createBundle(selectedCurrentBundleName)

  // Prepare the model check/comparison configuration
  const configInitOptions: ConfigInitOptions = {
    bundleNameL,
    bundleNameR
  }
  const configOptions = await getConfigOptions(bundleL, bundleR, configInitOptions)

  // Initialize the root Svelte component
  initAppShell(configOptions, {
    bundleNames
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
    if (info.kind === 'left') {
      saveBundleName('baseline', info.name)
      selectedBaselineBundleName = info.name
    } else {
      saveBundleName('current', info.name)
      selectedCurrentBundleName = info.name
    }

    // Reinitialize using the chosen bundles
    initBundlesAndUI()
  })

  // Reload everything when the user applies updated filters
  document.addEventListener('sde-check-apply-filters', () => {
    // Reinitialize using the new filters
    initBundlesAndUI()
  })
}
