// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  BundleGraphData,
  BundleGraphId,
  BundleModel as CheckBundleModel,
  DatasetKey,
  DatasetsResult,
  LinkItem,
  ModelSpec,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import { getGraphDataForScenario, getGraphLinksForScenario, getGraphSpecs } from './graphs'
import { getInputs } from './inputs'
import { getDatasetsForScenario } from './model-data'
import { getOutputs } from './outputs'

// import modelWorkerJs from './worker.iife.js?raw'

// The current version of the sample-check-bundle format.  This should be
// incremented when there is an incompatible change to the bundle format.
// The model-check tools can use this value to skip tests if two bundles
// have different version numbers.
const VERSION = 1

// The size (in bytes) of the model file(s), injected at build time.
const modelSizeInBytes = __MODEL_SIZE_IN_BYTES__

// The size (in bytes) of the data file(s), injected at build time.
const dataSizeInBytes = __DATA_SIZE_IN_BYTES__

// The special model version, injected at build time.  This is only used
// to determine which variables will be simulated by this sample bundle.
const modelVersion = __MODEL_VERSION__

export class BundleModel implements CheckBundleModel {
  /**
   * @param modelSpec The spec for the bundled model.
   */
  constructor(public readonly modelSpec: ModelSpec) {}

  // from CheckBundleModel interface
  async getDatasetsForScenario(scenarioSpec: ScenarioSpec, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    return getDatasetsForScenario(modelVersion, this.modelSpec, scenarioSpec, datasetKeys)
  }

  // from CheckBundleModel interface
  async getGraphDataForScenario(scenarioSpec: ScenarioSpec, graphId: BundleGraphId): Promise<BundleGraphData> {
    return getGraphDataForScenario(scenarioSpec, graphId)
  }

  // from CheckBundleModel interface
  getGraphLinksForScenario(scenarioSpec: ScenarioSpec, graphId: BundleGraphId): LinkItem[] {
    return getGraphLinksForScenario(scenarioSpec, graphId)
  }
}

/**
 * Initialize a `BundleModel` instance that supports the running the model
 * under different scenarios.
 */
async function initBundleModel(modelSpec: ModelSpec): Promise<BundleModel> {
  // TODO: The following (commented out) code demonstrates how to include a
  // worker module inside the generated bundle

  // // Initialize the wasm model asynchronously.  We inline the worker code in the
  // // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file
  // const modelRunner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Return a `BundleModel` that wraps the underlying config and wasm model
  return new BundleModel(modelSpec)
}

/**
 * Return a `Bundle` that can be used for running comparisons between two
 * bundles containing different versions of the sample model.
 */
export function createBundle(): Bundle {
  // Gather information about the input and output variables used in the model
  const inputs = getInputs(modelVersion)
  const outputs = getOutputs(modelVersion)

  // Configure graphs
  const graphSpecs = getGraphSpecs(modelVersion, outputs.outputVars)

  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars: inputs.inputVars,
    inputGroups: inputs.inputGroups,
    inputAliases: inputs.inputAliases,
    inputSettingGroups: inputs.inputSettingGroups,
    outputVars: outputs.outputVars,
    implVars: outputs.implVars,
    implVarGroups: outputs.implVarGroups,
    datasetGroups: outputs.datasetGroups,
    startTime: 2000,
    endTime: 2100,
    graphSpecs
  }

  return {
    version: VERSION,
    modelSpec,
    initModel: () => {
      return initBundleModel(modelSpec)
    }
  }
}
