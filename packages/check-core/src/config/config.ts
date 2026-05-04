// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { GetDatasetsOptions } from '../_shared/data-source'
import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import type { TaskExecutor, TaskExecutorKey } from '../_shared/task-queue'
import { createExecutor, TaskQueue } from '../_shared/task-queue'
import type { DatasetKey, DatasetMap } from '../_shared/types'

import type { BundleModel, LoadedBundle, NamedBundle } from '../bundle/bundle-types'

import type { CheckConfig } from '../check/check-config'

import type { ComparisonConfig } from '../comparison/config/comparison-config'
import { resolveComparisonSpecsFromSources } from '../comparison/config/comparison-config'
import { getComparisonDatasets } from '../comparison/config/comparison-datasets'
import { getComparisonScenarios } from '../comparison/config/comparison-scenarios'

import type { Config, ConfigOptions } from './config-types'

export async function createConfig(options: ConfigOptions): Promise<Config> {
  // Determine the number of model instances to initialize for each bundle
  let concurrentModels: number
  if (options.concurrency === undefined) {
    // Use the default behavior (one model instance per bundle)
    concurrentModels = 1
  } else if (options.concurrency === 0) {
    // Use the number of available CPU cores (i.e., the number of cores divided by 2)
    let coreCount: number
    if (typeof navigator !== 'undefined') {
      coreCount = navigator.hardwareConcurrency
    }
    if (coreCount === undefined || coreCount < 1) {
      coreCount = 1
    }
    concurrentModels = Math.max(1, Math.floor(coreCount / 2))
  } else {
    // Use the specified number of model instances per bundle
    concurrentModels = Math.max(1, options.concurrency)
  }

  // Initialize the model instances for the "current" bundle (the one being checked)
  const origCurrentBundle = await loadBundle(options.current, concurrentModels)

  // Create the comparison configuration, if defined
  let currentBundle: LoadedBundle
  let comparisonConfig: ComparisonConfig
  if (options.comparison === undefined) {
    // When there is no comparison configuration, there are no renames to handle,
    // so use the unmodified "current" bundle
    currentBundle = origCurrentBundle
  } else {
    // Initialize the model instances for the "baseline" bundle (the one that "current" will be
    // compared against)
    const baselineBundle = await loadBundle(options.comparison.baseline, concurrentModels)

    // Wrap the right bundle model instances so that they map "old" dataset keys to "new"
    // dataset keys if there are any renamed variables
    currentBundle = handleRenames(origCurrentBundle, options.comparison.datasets?.renamedDatasetKeys)

    // Combine and resolve the provided comparison specifications
    const modelSpecL = baselineBundle.modelSpec
    const modelSpecR = currentBundle.modelSpec
    const comparisonDefs = resolveComparisonSpecsFromSources(modelSpecL, modelSpecR, options.comparison.specs)

    // Initialize the configuration for comparisons
    comparisonConfig = {
      bundleL: baselineBundle,
      bundleR: currentBundle,
      thresholds: options.comparison.thresholds ?? [1, 5, 10],
      ratioThresholds: options.comparison.ratioThresholds ?? [1, 2, 3],
      scenarios: getComparisonScenarios(comparisonDefs.scenarios),
      datasets: getComparisonDatasets(modelSpecL, modelSpecR, options.comparison.datasets),
      viewGroups: comparisonDefs.viewGroups,
      reportOptions: options.comparison.report
    }
  }

  // Create the check configuration
  const checkConfig: CheckConfig = {
    bundle: currentBundle,
    tests: options.check.tests
  }

  // Initialize the task queue executors
  const executors: Map<TaskExecutorKey, TaskExecutor> = new Map()
  for (let i = 0; i < checkConfig.bundle.models.length; i++) {
    const bundleModelL = comparisonConfig?.bundleL.models?.[i]
    const bundleModelR = comparisonConfig?.bundleR.models?.[i] || checkConfig.bundle.models[i]
    const executor = createExecutor(bundleModelL, bundleModelR)
    executors.set(`executor-${i}`, executor)
  }
  TaskQueue.initialize(executors)

  return {
    check: checkConfig,
    comparison: comparisonConfig
  }
}

/**
 * Initialize the model instances for the given bundle.
 */
async function loadBundle(bundle: NamedBundle, concurrentModels: number): Promise<LoadedBundle> {
  const initCalls = Array.from({ length: concurrentModels }, () => bundle.bundle.initModel())
  const models = await Promise.all(initCalls)

  return {
    name: bundle.name,
    version: bundle.bundle.version,
    modelSpec: bundle.bundle.modelSpec,
    models
  }
}

function handleRenames(
  origCurrentBundle: LoadedBundle,
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>
): LoadedBundle {
  // If there are no renamed datasets, we can use the original model instances
  if (renamedDatasetKeys === undefined || renamedDatasetKeys.size === 0) {
    return origCurrentBundle
  }

  // Invert the map of renamed keys so that new names are on the left (map
  // keys) old names are on the right (map values)
  const invertedRenamedKeys: Map<DatasetKey, DatasetKey> = new Map()
  renamedDatasetKeys.forEach((newKey, oldKey) => {
    invertedRenamedKeys.set(newKey, oldKey)
  })

  const rightKeyForLeftKey = (leftKey: DatasetKey) => {
    return renamedDatasetKeys?.get(leftKey) || leftKey
  }

  const leftKeyForRightKey = (rightKey: DatasetKey) => {
    return invertedRenamedKeys.get(rightKey) || rightKey
  }

  function wrapModel(origBundleModelR: BundleModel): BundleModel {
    return {
      modelSpec: origBundleModelR.modelSpec,
      getDatasetsForScenario: async (
        scenarioSpec: ScenarioSpec,
        datasetKeys: DatasetKey[],
        options?: GetDatasetsOptions
      ) => {
        // The given dataset keys may be in "left" (old) or "right" (new) format depending
        // on whether the caller is a comparison test or a check test.  Translate any old
        // keys to new keys for the actual model call (new keys pass through unchanged).
        const rightKeySet: Set<DatasetKey> = new Set()
        for (const key of datasetKeys) {
          rightKeySet.add(rightKeyForLeftKey(key))
        }

        // Fetch from the underlying model using the "right" (new) keys
        const result = await origBundleModelR.getDatasetsForScenario(scenarioSpec, [...rightKeySet], options)

        // Build a result map that includes both old and new keys so that both comparison
        // tests (which look up by old key) and check tests (which look up by new key) can
        // find the data
        const resultMap: DatasetMap = new Map()
        for (const [rightKey, dataset] of result.datasetMap.entries()) {
          // Always include the new (right) key
          resultMap.set(rightKey, dataset)

          // Also include the old (left) key alias if this variable was renamed
          const leftKey = leftKeyForRightKey(rightKey)
          if (leftKey !== rightKey) {
            resultMap.set(leftKey, dataset)
          }
        }

        return {
          datasetMap: resultMap,
          modelRunTime: result.modelRunTime
        }
      },
      getGraphDataForScenario: origBundleModelR.getGraphDataForScenario?.bind(origBundleModelR),
      getGraphLinksForScenario: origBundleModelR.getGraphLinksForScenario?.bind(origBundleModelR),
      createGraphView: origBundleModelR.createGraphView?.bind(origBundleModelR)
    }
  }

  // Wrap each "current" bundle model with one that maps "old" dataset keys
  // to "new" dataset keys
  const wrappedModels = origCurrentBundle.models.map(wrapModel)
  return {
    ...origCurrentBundle,
    models: wrappedModels
  }
}
