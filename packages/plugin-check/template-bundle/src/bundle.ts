// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  BundleGraphData,
  BundleModel as CheckBundleModel,
  DatasetKey,
  DatasetsResult,
  LinkItem,
  ModelSpec,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { InputVarId } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import { getImplVars } from './impl-vars'
import { type Input, getInputVars } from './inputs'
import { getOutputVars } from './outputs'

import { encodedImplVars, inputSpecs, outputSpecs, modelSizeInBytes, dataSizeInBytes } from 'virtual:model-spec'

import modelWorkerJs from '@_model_worker_/worker.js?raw'
import { BundleModelRunner } from './bundle-model-runner'

// The current version of the check bundle format.  This should be
// incremented when there is an incompatible change to the bundle format.
// The model-check tools can use this value to skip tests if two bundles
// have different version numbers.
const VERSION = 1

export class BundleModel implements CheckBundleModel {
  /**
   * @param modelSpec The spec for the bundled model.
   * @param bundleModelRunner The bundle model runner.
   */
  constructor(
    public readonly modelSpec: ModelSpec,
    private readonly bundleModelRunner: BundleModelRunner
  ) {}

  // from CheckBundleModel interface
  async getDatasetsForScenario(scenario: ScenarioSpec, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    return this.bundleModelRunner.runModelForScenario(scenario, datasetKeys)
  }

  // from CheckBundleModel interface
  // TODO: This function should be optional
  async getGraphDataForScenario(): Promise<BundleGraphData> {
    return undefined
  }

  // from CheckBundleModel interface
  // TODO: This function should be optional
  getGraphLinksForScenario(): LinkItem[] {
    return []
  }
}

/**
 * Initialize a `BundleModel` instance that supports the running the model
 * under different scenarios.
 */
async function initBundleModel(modelSpec: ModelSpec, inputMap: Map<InputVarId, Input>): Promise<BundleModel> {
  // Initialize the JS/Wasm model asynchronously.  We inline the worker code in the
  // rolled-up bundle so that we don't have to fetch a separate `worker.js` file
  const modelRunner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Create a `BundleModelRunner` that wraps the `ModelRunner` instance and takes
  // care of translating `runtime` types to the types expected by `check-core`
  const bundleModelRunner = new BundleModelRunner(modelSpec, inputMap, modelRunner)

  // Return a `BundleModel` that wraps the underlying config and Wasm model
  return new BundleModel(modelSpec, bundleModelRunner)
}

/**
 * Return a `Bundle` that can be used for running comparisons between two
 * bundles containing different versions of the sample model.
 */
export function createBundle(): Bundle {
  // Gather information about the input and output variables used in the model
  const inputVars = getInputVars(inputSpecs)
  const outputVars = getOutputVars(outputSpecs)

  // Gather information about internal/implementation variables
  const { implVars, implVarGroups } = getImplVars(encodedImplVars)

  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars,
    outputVars,
    implVars,
    implVarGroups
    // TODO: startTime and endTime are optional; the comparison graphs work OK if
    // they are undefined.  The main benefit of using these is to set a specific
    // range for the x-axis on the comparison graphs, so maybe we should find
    // another way to allow these to be defined.
    // startTime,
    // endTime
  }

  return {
    version: VERSION,
    modelSpec,
    initModel: () => {
      return initBundleModel(modelSpec, inputVars)
    }
  }
}
