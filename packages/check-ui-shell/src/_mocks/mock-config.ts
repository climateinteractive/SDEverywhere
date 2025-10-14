// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { ComparisonSpecs, ConfigOptions, NamedBundle } from '@sdeverywhere/check-core'

import { scenarioWithAllInputsAtDefaultSpec } from './mock-comparison-scenario-spec'

export function mockConfigOptions(bundleL: NamedBundle, bundleR: NamedBundle): ConfigOptions {
  const allPositive = `
- describe: Output 1
  tests:
    - it: should be positive
      scenarios:
        - with: Constant 1
          at: max
      datasets:
        - name: Output 1
      predicates:
        - gt: 0
  `

  const checkTests = [allPositive]

  const comparisonSpecs: ComparisonSpecs = {
    scenarios: [scenarioWithAllInputsAtDefaultSpec()]
  }

  return {
    current: bundleR,
    check: {
      tests: checkTests
    },
    comparison: {
      baseline: bundleL,
      thresholds: [1, 5, 10],
      specs: [comparisonSpecs]
    }
  }
}
