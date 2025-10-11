// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { ComparisonSpecs, Config, ConfigOptions, NamedBundle } from '@sdeverywhere/check-core'
import { createConfig } from '@sdeverywhere/check-core'

import { scenarioWithAllInputsAtDefaultSpec } from './mock-comparison-scenario-spec'

export async function mockConfig(bundleL: NamedBundle, bundleR: NamedBundle): Promise<Config> {
  const comparisonSpecs: ComparisonSpecs = {
    scenarios: [scenarioWithAllInputsAtDefaultSpec()]
  }
  const configOptions: ConfigOptions = {
    current: bundleR,
    check: {
      tests: []
    },
    comparison: {
      baseline: bundleL,
      thresholds: [1, 5, 10],
      specs: [comparisonSpecs]
    }
  }
  return createConfig(configOptions)
}
