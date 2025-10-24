// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  BundleModel,
  DatasetKey,
  DatasetMap,
  ModelSpec,
  NamedBundle,
  ScenarioSpec
} from '@sdeverywhere/check-core'

export function mockBundleModel(
  modelSpec: ModelSpec,
  datasetsForScenario: (scenarioSpec: ScenarioSpec, datasetKeys: DatasetKey[]) => DatasetMap,
  options?: {
    delayInGetDatasets?: number
  }
): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async (scenarioSpec, datasetKeys) => {
      if (options?.delayInGetDatasets) {
        await new Promise(resolve => setTimeout(resolve, options.delayInGetDatasets))
      }
      return {
        datasetMap: datasetsForScenario(scenarioSpec, datasetKeys)
      }
    },
    getGraphDataForScenario: async () => {
      return undefined
    },
    getGraphLinksForScenario: () => {
      return []
    }
  }
}

export function mockNamedBundle(name: string, bundleModel: BundleModel): NamedBundle {
  return {
    name,
    bundle: {
      modelSpec: bundleModel.modelSpec,
      version: 1,
      initModel: async () => {
        return bundleModel
      }
    }
  }
}
