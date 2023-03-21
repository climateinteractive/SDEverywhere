// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, DatasetMap } from '../_shared/types'
import type { BundleModel, LoadedBundle, NamedBundle } from '../bundle/bundle-types'
import { ModelInputs } from '../bundle/model-inputs'

import type { CheckConfig } from '../check/check-config'

import type { CompareConfig } from '../compare/config/compare-config'
import { resolveCompareSpecsFromSources } from '../compare/config/compare-config'
import { getCompareDatasets } from '../compare/config/compare-datasets'
import { CompareScenarios } from '../compare/config/compare-scenarios'

import type { Config, ConfigOptions } from './config-types'
import { synchronizedBundleModel } from './synchronized-model'
import type { ScenarioSpec } from '../_shared/scenario-spec-types'

export async function createConfig(options: ConfigOptions): Promise<Config> {
  // Initialize the "current" bundle model (the one being checked)
  const origCurrentBundle = await loadSynchronized(options.current)

  // Create the comparison configuration, if defined
  let currentBundle: LoadedBundle
  let compareConfig: CompareConfig
  if (options.compare === undefined) {
    // When there is no comparison configuration, there are no renames to handle,
    // so use the unmodified "current" bundle
    currentBundle = origCurrentBundle
  } else {
    // Initialize the "baseline" bundle model (the one that "current" will be
    // compared against)
    const baselineBundle = await loadSynchronized(options.compare.baseline)

    // Invert the map of renamed keys so that new names are on the left (map
    // keys) old names are on the right (map values)
    const renamedDatasetKeys = options.compare.renamedDatasetKeys
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
      getGraphsForDataset: origBundleModelR.getGraphsForDataset?.bind(origBundleModelR),
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
    const modelInputsL = new ModelInputs(modelSpecL)
    const modelInputsR = new ModelInputs(modelSpecR)
    const compareDefs = resolveCompareSpecsFromSources(modelInputsL, modelInputsR, options.compare.specs)

    // Initialize the configuration for comparisons
    compareConfig = {
      bundleL: baselineBundle,
      bundleR: currentBundle,
      thresholds: options.compare.thresholds,
      scenarios: new CompareScenarios(compareDefs.scenarios),
      viewGroups: compareDefs.viewGroups,
      datasets: getCompareDatasets(modelSpecL, modelSpecR, options.compare.renamedDatasetKeys)
    }
  }

  // Create the check configuration
  const checkConfig: CheckConfig = {
    bundle: currentBundle,
    tests: options.check.tests
  }

  return {
    check: checkConfig,
    compare: compareConfig
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
