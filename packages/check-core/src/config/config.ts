// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import type { DatasetKey, DatasetMap } from '../_shared/types'
import type { BundleModel, LoadedBundle, NamedBundle } from '../bundle/bundle-types'

import type { CheckConfig } from '../check/check-config'

import type { ComparisonConfig } from '../comparison/config/comparison-config'
import { resolveComparisonSpecsFromSources } from '../comparison/config/comparison-config'
import { getComparisonDatasets } from '../comparison/config/comparison-datasets'
import { getComparisonScenarios } from '../comparison/config/comparison-scenarios'

import type { Config, ConfigOptions } from './config-types'
import { synchronizedBundleModel } from './synchronized-model'

export async function createConfig(options: ConfigOptions): Promise<Config> {
  // Initialize the "current" bundle model (the one being checked)
  const origCurrentBundle = await loadSynchronized(options.current)

  // Create the comparison configuration, if defined
  let currentBundle: LoadedBundle
  let comparisonConfig: ComparisonConfig
  if (options.comparison === undefined) {
    // When there is no comparison configuration, there are no renames to handle,
    // so use the unmodified "current" bundle
    currentBundle = origCurrentBundle
  } else {
    // Initialize the "baseline" bundle model (the one that "current" will be
    // compared against)
    const baselineBundle = await loadSynchronized(options.comparison.baseline)

    // Invert the map of renamed keys so that new names are on the left (map
    // keys) old names are on the right (map values)
    const renamedDatasetKeys = options.comparison.datasets?.renamedDatasetKeys
    const invertedRenamedKeys: Map<DatasetKey, DatasetKey> = new Map()
    renamedDatasetKeys?.forEach((newKey, oldKey) => {
      invertedRenamedKeys.set(newKey, oldKey)
    })

    const rightKeyForLeftKey = (leftKey: DatasetKey) => {
      return renamedDatasetKeys?.get(leftKey) || leftKey
    }

    const leftKeyForRightKey = (rightKey: DatasetKey) => {
      return invertedRenamedKeys.get(rightKey) || rightKey
    }

    // Wrap the right bundle model with one that maps "old" dataset keys
    // to "new" dataset keys
    const origBundleModelR = origCurrentBundle.model
    const adjBundleModelR: BundleModel = {
      modelSpec: origBundleModelR.modelSpec,
      getDatasetsForScenario: async (scenarioSpec: ScenarioSpec, datasetKeys: DatasetKey[]) => {
        // The given dataset keys are for the "left" bundle, so convert to the "right" keys
        const rightKeys = datasetKeys.map(rightKeyForLeftKey)

        // The returned dataset map has the "right" keys, so convert back to the "left" keys
        const result = await origBundleModelR.getDatasetsForScenario(scenarioSpec, rightKeys)
        const mapWithRightKeys = result.datasetMap
        const mapWithLeftKeys: DatasetMap = new Map()
        for (const [rightKey, dataset] of mapWithRightKeys.entries()) {
          const leftKey = leftKeyForRightKey(rightKey)
          mapWithLeftKeys.set(leftKey, dataset)
        }

        return {
          datasetMap: mapWithLeftKeys,
          modelRunTime: result.modelRunTime
        }
      },
      getGraphDataForScenario: origBundleModelR.getGraphDataForScenario.bind(origBundleModelR),
      getGraphLinksForScenario: origBundleModelR.getGraphLinksForScenario.bind(origBundleModelR)
    }
    currentBundle = {
      ...origCurrentBundle,
      model: adjBundleModelR
    }

    // Combine and resolve the provided comparison specifications
    const modelSpecL = baselineBundle.model.modelSpec
    const modelSpecR = currentBundle.model.modelSpec
    const comparisonDefs = resolveComparisonSpecsFromSources(modelSpecL, modelSpecR, options.comparison.specs)

    // Initialize the configuration for comparisons
    comparisonConfig = {
      bundleL: baselineBundle,
      bundleR: currentBundle,
      thresholds: options.comparison.thresholds,
      scenarios: getComparisonScenarios(comparisonDefs.scenarios),
      datasets: getComparisonDatasets(modelSpecL, modelSpecR, options.comparison.datasets),
      viewGroups: comparisonDefs.viewGroups
    }
  }

  // Create the check configuration
  const checkConfig: CheckConfig = {
    bundle: currentBundle,
    tests: options.check.tests
  }

  return {
    check: checkConfig,
    comparison: comparisonConfig
  }
}

/**
 * Loads the given model and wraps the underlying `BundleModel` in a new
 * `BundleModel` that synchronizes (i.e., single-tracks) the wrapped model
 * so that only one call to `getDatasetsForScenario` can be made at a time.
 *
 * @param sourceBundle The bundle to be loaded.
 */
async function loadSynchronized(sourceBundle: NamedBundle): Promise<LoadedBundle> {
  const sourceModel = await sourceBundle.bundle.initModel()
  const synchronizedModel = synchronizedBundleModel(sourceModel)
  return {
    name: sourceBundle.name,
    version: sourceBundle.bundle.version,
    model: synchronizedModel
  }
}
