// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Bundle, ConfigOptions } from '@sdeverywhere/check-core'

import { getCompareDatasets } from './compare/compare-datasets'
import { getCompareScenarios } from './compare/compare-scenarios'

import checksYaml from './check/checks.yaml?raw'
// import compareScenariosYaml from './compare/scenarios.yaml?raw'

export function getConfigOptions(bundleL: Bundle, bundleR: Bundle): ConfigOptions {
  // Configure the set of input scenarios used for comparisons; this includes
  // the default matrix of scenarios plus some custom multi-input scenarios
  const compareScenarios = getCompareScenarios(bundleL, bundleR)

  // Configure the datasets to be compared
  const compareDatasets = getCompareDatasets(bundleL, bundleR)

  return {
    current: {
      name: 'Sample Model Current',
      bundle: bundleR
    },
    check: {
      tests: [checksYaml]
    },
    compare: {
      baseline: {
        name: 'Sample Model Baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      scenarios: compareScenarios,
      // scenariosYaml: compareScenariosYaml,
      datasets: compareDatasets
    }
  }
}
