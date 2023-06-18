// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { LoadedBundle } from '../bundle/bundle-types'
import type { CheckSpec, CheckSpecsSource } from './check-spec'

export interface CheckOptions {
  /**
   * The requested check test specifications.  These can be
   * specified in YAML or JSON files, or using `Spec` objects.
   */
  specs: CheckSpecsSource[]
  // TODO: Add support for checks defined in code, like we have for comparison tests
  // specs: (CheckSpec | CheckSpecsSource)[]
}

export interface CheckConfig {
  /**
   * The loaded bundle being checked.
   */
  bundle: LoadedBundle

  /**
   * The parsed check tests specification.
   * @hidden This is not yet exposed in the API because the CheckConfig type has not yet
   * been updated to match the approach used in ComparisonConfig (where the specs are
   * parsed and fully resolved ahead of time).
   */
  spec: CheckSpec
}
