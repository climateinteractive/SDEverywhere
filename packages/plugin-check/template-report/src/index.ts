// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, SuiteSummary } from '@sdeverywhere/check-core'

import { initAppShell } from '@sdeverywhere/check-ui-shell'
import '@sdeverywhere/check-ui-common/dist/style.css'

import { initOverlay } from './overlay'

import './global.css'

// These aliases are specified in the Vite config to point to the actual bundles
import { createBundle as createBaselineBundle } from '@_baseline_bundle_'
import { createBundle as createCurrentBundle } from '@_current_bundle_'
import { getConfigOptions } from '@_test_config_'

// For "production" builds, load the summary from a JSON file that
// was generated as part of the build process.  This makes the
// report load almost immediately instead of running all the checks
// in the user's browser.
const suiteSummaryJson = __SUITE_SUMMARY_JSON__
let suiteSummary: SuiteSummary
if (suiteSummaryJson) {
  suiteSummary = JSON.parse(suiteSummaryJson) as SuiteSummary
}

async function init() {
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

  // Initialize the overlay element used to show builder messages/errors
  initOverlay()
}

init()
