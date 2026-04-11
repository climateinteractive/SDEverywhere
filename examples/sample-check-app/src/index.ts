// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Bundle, SuiteSummary } from '@sdeverywhere/check-core'
import { initAppShell } from '@sdeverywhere/check-ui-shell'

import { getConfigOptions } from '../../sample-check-tests/src'

// For this sample app, compare the simulated "v1" model to the "v2" model.  In a real
// environment, the baseline bundle would be downloaded as an artifact of an earlier
// build, and the bundles wouldn't need to have version numbers in their names.
import { createBundle as baselineBundle } from '../../sample-check-bundle/dist/sample-check-bundle-v1.js'
import { createBundle as currentBundle } from '../../sample-check-bundle/dist/sample-check-bundle-v2.js'

// For "production" builds, load the summary from a JSON file that was generated as
// part of the build process.  This makes the report load almost immediately instead
// of running all the checks in the user's browser.
const suiteSummaryJson = __SUITE_SUMMARY_JSON__
let suiteSummary: SuiteSummary
if (suiteSummaryJson) {
  suiteSummary = JSON.parse(suiteSummaryJson) as SuiteSummary
}

async function initBundlesAndUI() {
  // Before switching bundles, clear out the app-shell-container element
  const container = document.getElementById('app-shell-container')
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  // TODO: Release resources associated with active bundles

  // Load the bundles and build the model check/compare configuration
  const configOptions = getConfigOptions(baselineBundle() as Bundle, currentBundle() as Bundle)

  // Initialize the root Svelte component
  initAppShell(configOptions, {
    suiteSummary
  })
}

// Initialize the bundles and user interface
initBundlesAndUI()

// Reload everything when the user applies updated configuration (e.g., updated filters or
// concurrency setting)
document.addEventListener('sde-check-config-changed', () => {
  // Reinitialize using the new configuration
  initBundlesAndUI()
})
