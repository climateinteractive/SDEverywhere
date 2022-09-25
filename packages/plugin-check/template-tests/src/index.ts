// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, CompareOptions, ConfigOptions, DatasetKey } from '@sdeverywhere/check-core'

import { DatasetManager, ScenarioManager } from '@sdeverywhere/check-core'

// Load the yaml test files
const yamlGlob = import.meta.glob(__YAML_PATH__, {
  eager: true,
  as: 'raw'
})
const tests: string[] = []
for (const yamlKey of Object.keys(yamlGlob)) {
  const yaml = yamlGlob[yamlKey]
  tests.push(yaml as unknown as string)
}

// If an output variable is renamed, define the mapping from the old key
// to the new key here.  If this step is omitted, the old variable will
// appear as being removed and the new variable will appear as being added,
// which will prevent them from being compared.
// TODO: Inject this from sde.config.ts file
const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map([
  // ['Model_old_name', 'Model_new_name']
])

export interface BundleOptions {
  nameL?: string
  nameR?: string
}

// TODO: Make this pluggable (with default implementation similar to below)
export async function getConfigOptions(
  bundleL: Bundle | undefined,
  bundleR: Bundle,
  opts: BundleOptions
): Promise<ConfigOptions> {
  // Only include compare options if the baseline bundle is defined (and
  // has the same version)
  let compareOptions: CompareOptions
  if (bundleL && bundleL.version === bundleR.version) {
    // Configure the set of input scenarios used for comparisons.  This includes
    // the default matrix of scenarios; for any output variable, the model will
    // be run:
    //   - once with all inputs at their default
    //   - once with all inputs at their minimum
    //   - once with all inputs at their maximum
    //   - twice for each input
    //       - once with single input at its minimum
    //       - once with single input at its maximum
    const scenarios = new ScenarioManager(bundleL, bundleR)
    scenarios.addScenarioMatrix()

    // Configure the dataset keys (corresponding to the available model outputs
    // in the given bundles) that can be used to compare two versions of the model
    const datasets = new DatasetManager(bundleL, bundleR, renamedDatasetKeys)

    compareOptions = {
      baseline: {
        name: opts?.nameL || 'baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      scenarios,
      datasets
    }
  }

  return {
    current: {
      name: opts?.nameR || 'current',
      bundle: bundleR
    },
    check: {
      tests
    },
    compare: compareOptions
  }
}
