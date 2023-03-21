// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { NamedBundle } from '../bundle/bundle-types'
import type { CheckConfig, CheckOptions } from '../check/check-config'
import type { ComparisonConfig, ComparisonOptions } from '../comparison/config/comparison-config'

export interface ConfigOptions {
  /**
   * The bundle being checked.  This bundle will also be compared against the
   * "baseline" bundle, if `comparison` options are defined.
   */
  current: NamedBundle
  /**
   * The model check options.
   */
  check: CheckOptions
  /**
   * The model comparison options.
   */
  comparison?: ComparisonOptions
}

export interface Config {
  /** The resolved check test configuration. */
  check: CheckConfig
  /** The resolved comparison test configuration. */
  comparison?: ComparisonConfig
}
