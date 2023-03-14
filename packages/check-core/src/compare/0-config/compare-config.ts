// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { LoadedBundle, NamedBundle } from '../../bundle/bundle-types'
import type { CompareDatasets } from '../compare-datasets'
import type { CompareScenario, CompareViewGroup } from '../_shared/compare-resolved-types'
import type { CompareSpecs, CompareSpecsSource } from '../_shared/compare-spec-types'

export interface CompareOptions {
  /** The left-side ("baseline") bundle being compared. */
  baseline: NamedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /**
   * The requested comparison scenario and view specifications.  These can be
   * specified in YAML or JSON files, or using `Spec` objects.
   */
  specs: (CompareSpecs | CompareSpecsSource)[]
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
  /** The set of resolved scenarios. */
  scenarios: CompareScenario[]
  /** The set of resolved view groups. */
  viewGroups: CompareViewGroup[]
  /** The set of datasets that will be compared. */
  datasets: CompareDatasets
}
