// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { SuiteSummary } from '@sdeverywhere/check-core'

import type { BundleSelectorConfig } from './components/bundle/bundle-selector-config'

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
   * The options used to configure the bundle selector component.  This is only used in local
   * development mode and will be ignored when building for production.
   */
  bundleSelectorConfig?: BundleSelectorConfig
}
