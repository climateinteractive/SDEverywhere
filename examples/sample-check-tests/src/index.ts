// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Bundle, ConfigOptions } from '@sdeverywhere/check-core'

import { getCompareDatasets } from './compare-datasets'
import { getCompareScenarios } from './compare-scenarios'

import tests from './tests.yaml?raw'

export function getConfigOptions(bundleL: Bundle, bundleR: Bundle): ConfigOptions {
  // Configure the set of input scenarios used for comparisons; this includes
  // the default matrix of scenarios plus some custom multi-input scenarios
  const scenarios = getCompareScenarios(bundleL, bundleR)

  // Configure the datasets to be compared
  const datasets = getCompareDatasets(bundleL, bundleR)

  return {
    current: {
      name: 'Sample Model Current',
      bundle: bundleR
    },
    check: {
      tests: [tests]
    },
    compare: {
      baseline: {
        name: 'Sample Model Baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      scenarios,
      datasets
    }
  }
}

export function getCheckTests(): string[] {
  return [tests]
}
