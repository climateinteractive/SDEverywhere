// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, SuiteSummary } from '@sdeverywhere/check-core'

import { initAppShell } from '@sdeverywhere/check-ui-shell'
import '@sdeverywhere/check-ui-shell/dist/style.css'

import { initOverlay } from './overlay'

import './global.css'

// These aliases are specified in the Vite config to point to the actual bundles
import { createBundle as createBaselineBundle } from '@_baseline_bundle_'
import { createBundle as createCurrentBundle } from '@_current_bundle_'
import { getConfigOptions } from '@_test_config_'

// Initialize the overlay element used to show builder messages/errors
initOverlay()

// For local development mode, load the list of available baseline bundles
let baselineBundleNames: string[]
let currentBundleNames: string[]
// TODO: Only do this if baseline bundles path is defined
// TODO: Sort them alphabetically (reversed, so that newer dates are first)
// TODO: If no bundles, default to current
// TODO: If no saved bundle name, default to current
let selectedBaselineBundleName: string
let selectedCurrentBundleName: string
const baselinesPath = __BASELINE_BUNDLES_PATH__
if (import.meta && baselinesPath) {
  // Get the available bundles
  const bundlesGlob = import.meta.glob(__BASELINE_BUNDLES_PATH__, {
    eager: false
  })
  // const baselineBundles: string[] = []
  console.log(`BUNDLE COUNT: ${Object.keys(bundlesGlob).length}`)
  for (const bundleKey of Object.keys(bundlesGlob)) {
    const loadBundle = bundlesGlob[bundleKey]
    console.log(bundleKey)
    console.log(loadBundle)
  }
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

  // Prepare the model check/compare configuration
  const checkOptions = await getConfigOptions(bundleL, bundleR, {
    nameL: __BASELINE_NAME__ || undefined,
    nameR: __CURRENT_NAME__
  })

  // Initialize the root Svelte component
  initAppShell(checkOptions, suiteSummary)
}

async function initForLocal(): Promise<void> {
  // Prepare the model check/compare configuration
  // XXX: For now, use current vs itself
  const bundleR: Bundle = createCurrentBundle()
  const bundleL = bundleR
  const checkOptions = await getConfigOptions(bundleL, bundleR, {
    nameL: __CURRENT_NAME__,
    nameR: __CURRENT_NAME__
  })

  // Initialize the root Svelte component
  initAppShell(checkOptions)
}

async function init() {
  // Prepare options differently if in local development mode
  if (import.meta) {
    await initForLocal()
  } else {
    await initForProduction()
  }
}

// Initialize the bundles and user interface
init()

// Reload everything when the user chooses a new baseline or current bundle
document.addEventListener('sde-check-bundle', e => {
  // Change the selected bundle
  const info = (e as CustomEvent).detail
  if (info.kind === 'left') {
    selectedBaselineBundleName = info.name
  } else {
    selectedCurrentBundleName = info.name
  }

  // Before switching bundles, clear out the app-shell-container element
  const container = document.getElementById('app-shell-container')
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  // TODO: Release resources associated with active bundles

  // Reinitialize using the chosen bundles
  init()
})
