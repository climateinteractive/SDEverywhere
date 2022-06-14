// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  BundleGraphData,
  BundleGraphId,
  BundleModel as CheckBundleModel,
  DatasetKey,
  DatasetsResult,
  ImplVar,
  InputVar,
  LinkItem,
  ModelSpec,
  Scenario
} from '@sdeverywhere/check-core'

import { getGraphDataForScenario, getGraphLinksForScenario, getGraphSpecs } from './graphs'
import { getInputVars } from './inputs'
import { getDatasetsForScenario } from './model-data'
import { getOutputVars } from './outputs'

// import modelWorkerJs from './worker.iife.js?raw'

// The current version of the sample-check-bundle format.  This should be
// incremented when there is an incompatible change to the bundle format.
// The model-check tools can use this value to skip tests if two bundles
// have different version numbers.
const VERSION = 1

// The size (in bytes) of the model file(s), injected at build time.
const __MODEL_SIZE_IN_BYTES__ = 1
const modelSizeInBytes = __MODEL_SIZE_IN_BYTES__

// The size (in bytes) of the data file(s), injected at build time.
const __DATA_SIZE_IN_BYTES__ = 1
const dataSizeInBytes = __DATA_SIZE_IN_BYTES__

// The special model version, injected at build time.  This is only used
// to determine which variables will be simulated by this sample bundle.
const __MODEL_VERSION__ = 1
const modelVersion = __MODEL_VERSION__

export class BundleModel implements CheckBundleModel {
  /**
   * @param modelSpec The spec for the bundled model.
   */
  constructor(public readonly modelSpec: ModelSpec) {}

  // from CheckBundleModel interface
  async getDatasetsForScenario(scenario: Scenario, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    return getDatasetsForScenario(modelVersion, this.modelSpec, scenario, datasetKeys)
  }

  // from CheckBundleModel interface
  async getGraphDataForScenario(scenario: Scenario, graphId: BundleGraphId): Promise<BundleGraphData> {
    return getGraphDataForScenario(scenario, graphId)
  }

  // from CheckBundleModel interface
  getGraphLinksForScenario(scenario: Scenario, graphId: BundleGraphId): LinkItem[] {
    return getGraphLinksForScenario(scenario, graphId)
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
  const inputVars = getInputVars()
  const outputVars = getOutputVars(modelVersion)

  // TODO: For an SDEverywhere-generated model, you could use the JSON file
  // produced by `sde generate --listjson` to create an `ImplVar` for each
  // internal variable used in the model.  For the purposes of this sample
  // bundle, we will synthesize `ImplVar` instances for the model outputs.
  const implVarArray = [...outputVars.values()]
    .filter(outputVar => outputVar.sourceName === undefined)
    .map((outputVar, index) => {
      const implVar: ImplVar = {
        varId: outputVar.varId,
        varName: outputVar.varName,
        varIndex: index,
        dimensions: [],
        varType: 'aux'
      }
      return implVar
    })
  const implVars: Map<DatasetKey, ImplVar> = new Map()
  implVarArray.forEach(implVar => {
    implVars.set(`ModelImpl${implVar.varId}`, implVar)
  })

  // Configure input groups
  const inputGroups: Map<string, InputVar[]> = new Map([
    ['All Inputs', [...inputVars.values()]],
    ['Input Group 1', [inputVars.get('_input_a'), inputVars.get('_input_b')]],
    ['Empty Input Group', []]
  ])

  // Configure dataset groups
  const keyForVarWithName = (name: string) => {
    return [...outputVars.entries()].find(e => e[1].varName === name)[0]
  }
  const keysForVarsWithSource = (sourceName?: string) => {
    return [...outputVars.entries()].filter(e => e[1].sourceName === sourceName).map(([k]) => k)
  }
  const datasetGroups: Map<string, DatasetKey[]> = new Map([
    ['All Outputs', keysForVarsWithSource(undefined)],
    ['Basic Outputs', [keyForVarWithName('Output X'), keyForVarWithName('Output Y'), keyForVarWithName('Output Z')]],
    ['Static', keysForVarsWithSource('StaticData')]
  ])

  // Configure graphs
  const graphSpecs = getGraphSpecs(modelVersion, outputVars)

  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars,
    outputVars,
    implVars,
    inputGroups,
    datasetGroups,
    startTime: 1850,
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
