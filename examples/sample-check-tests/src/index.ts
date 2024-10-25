// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonSpecs,
  ComparisonSpecsSource,
  ConfigInitOptions,
  ConfigOptions,
  DatasetKey
} from '@sdeverywhere/check-core'

import { createBaseComparisonSpecs } from './comparisons/comparison-specs'

const checksYamlGlob = import.meta.glob('./checks/*.yaml', { eager: true, query: '?raw', import: 'default' })
const checksYaml = Object.values(checksYamlGlob) as string[]

const comparisonsYamlGlob = import.meta.glob('./comparisons/*.yaml', { eager: true, query: '?raw', import: 'default' })
const comparisonsYaml: ComparisonSpecsSource[] = Object.entries(comparisonsYamlGlob).map(entry => {
  return {
    kind: 'yaml',
    filename: entry[0],
    content: entry[1] as string
  }
})

export function getConfigOptions(bundleL: Bundle, bundleR: Bundle, opts?: ConfigInitOptions): ConfigOptions {
  // Configure the set of input scenarios used for comparisons; this includes
  // the default matrix of scenarios
  const baseComparisonSpecs = createBaseComparisonSpecs(bundleL, bundleR)

  // If the user checked the "Simplify Scenarios" checkbox, we can include a smaller subset
  // of scenarios.  (This won't make a difference for this simple demo, but can be helpful
  // for large models that take a while to run.)
  const comparisonSpecs: (ComparisonSpecs | ComparisonSpecsSource)[] = [baseComparisonSpecs]
  if (opts?.simplifyScenarios !== true) {
    comparisonSpecs.push(...comparisonsYaml)
  }

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
      specs: comparisonSpecs,
      datasets: {
        renamedDatasetKeys,
        referencePlotsForDataset: (dataset, scenario) => {
          if (dataset.key === 'Model__output_x' && scenario.title.startsWith('Input A')) {
            return [
              {
                datasetKey: 'StaticData__static_s',
                color: 'orange',
                style: 'dashed',
                lineWidth: 2
              }
            ]
          }
          return []
        }
      }
    }
  }
}
