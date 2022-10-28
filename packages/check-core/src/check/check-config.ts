// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { LoadedBundle } from '../bundle/bundle-types'

export interface CheckOptions {
  /** The strings containing check tests in YAML format. */
  tests: string[]
}

export interface CheckConfig {
  /** The loaded bundle being checked. */
  bundle: LoadedBundle

  /** The strings containing check tests in YAML format. */
  tests: string[]
}
