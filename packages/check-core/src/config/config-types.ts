// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { NamedBundle } from '../bundle/bundle-types'
import type { CheckConfig, CheckOptions } from '../check/check-config'
import type { CompareConfig, CompareOptions } from '../compare/compare-config'

export interface ConfigOptions {
  /**
   * The bundle being checked.  This bundle will also be compared against the
   * "baseline" bundle, if `compare` is defined.
   */
  current: NamedBundle
  /**
   * The model check options.
   */
  check: CheckOptions
  /**
   * The model comparison options.
   */
  compare?: CompareOptions
}

export interface Config {
  check: CheckConfig
  compare?: CompareConfig
}
