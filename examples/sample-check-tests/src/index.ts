// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Bundle, ComparisonSpecsSource, ConfigOptions, DatasetKey } from '@sdeverywhere/check-core'

import { createBaseComparisonSpecs } from './comparisons/comparison-specs'

const checksYamlGlob = import.meta.glob('./checks/*.yaml', { eager: true, as: 'raw' })
const checksYaml = Object.values(checksYamlGlob)

const comparisonsYamlGlob = import.meta.glob('./comparisons/*.yaml', { eager: true, as: 'raw' })
const comparisonsYaml: ComparisonSpecsSource[] = Object.entries(comparisonsYamlGlob).map(entry => {
  return {
    kind: 'yaml',
    filename: entry[0],
    content: entry[1]
  }
})

export function getConfigOptions(bundleL: Bundle, bundleR: Bundle): ConfigOptions {
  // Configure the set of input scenarios used for comparisons; this includes
  // the default matrix of scenarios
  const baseComparisonSpecs = createBaseComparisonSpecs(bundleL, bundleR)

  // Simulate a variable being renamed between two versions of the model
  // (see `getOutputVars` in `sample-model-bundle`)
  const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map([['Model__output_w_v1', 'Model__output_w_v2']])

  return {
    current: {
      name: 'Sample Model Current',
      bundle: bundleR
    },
    check: {
      tests: checksYaml
    },
    comparison: {
      baseline: {
        name: 'Sample Model Baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      specs: [baseComparisonSpecs, ...comparisonsYaml],
      renamedDatasetKeys
    }
  }
}
