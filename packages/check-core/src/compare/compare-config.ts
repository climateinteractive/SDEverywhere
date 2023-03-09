// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { LoadedBundle, NamedBundle } from '../bundle/bundle-types'
import type { CompareDatasets } from './compare-datasets'
import type { CompareScenarios } from './compare-scenarios'

export interface CompareOptions {
  /** The left-side ("baseline") bundle being compared. */
  baseline: NamedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /** The set of input scenarios that will be compared. */
  scenarios?: CompareScenarios
  /**
   * The strings containing comparison scenario definitions in YAML format.  If
   * defined, these will be combined with the `scenarios` property.
   */
  scenarioYaml?: string[]
  /** The set of datasets that will be compared. */
  datasets: CompareDatasets
}

export interface CompareConfig {
  /** The loaded left-side ("baseline") bundle being compared. */
  bundleL: LoadedBundle
  /** The loaded right-side ("current") bundle being compared. */
  bundleR: LoadedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /** The resolved set of input scenarios that will be compared. */
  scenarios: CompareScenarios
  /** The set of datasets that will be compared. */
  datasets: CompareDatasets
}
