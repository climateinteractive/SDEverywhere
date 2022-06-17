// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  BundleGraphData,
  BundleModel as CheckBundleModel,
  Dataset,
  DatasetKey,
  DatasetMap,
  DatasetsResult,
  LinkItem,
  ModelSpec,
  Scenario
} from '@sdeverywhere/check-core'

import type { ModelRunner, Point } from '@sdeverywhere/runtime'
import { Outputs } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import { getInputVars, setInputsForScenario } from './inputs'
import { getOutputVars } from './outputs'

import modelWorkerJs from '@_model_worker_/worker.js?raw'

// TODO: Get these from the ModelSpec defined by `sde.config.js`
const startTime = 2000
const endTime = 2100

// The current version of the check bundle format.  This should be
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
  private outputs: Outputs

  /**
   * @param modelSpec The spec for the bundled model.
   * @param modelRunner The model runner.
   */
  constructor(public readonly modelSpec: ModelSpec, private readonly modelRunner: ModelRunner) {
    // Create an `Outputs` instance that is initialized to hold output data
    // produced by the Wasm model
    this.outputs = new Outputs(outputVarIds, startTime, endTime)
  }

  // from CheckBundleModel interface
  async getDatasetsForScenario(scenario: Scenario, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    const datasetMap: DatasetMap = new Map()

    // Set the input values according to the given scenario
    setInputsForScenario(this.inputMap, scenario)

    // Run the JS model
    this.outputs = await this.modelRunner.runModel(this.inputs, this.outputs)
    const modelRunTime = this.outputs.runTimeInMillis

    // Extract the data for each requested output variable and put it into a map
    for (const datasetKey of datasetKeys) {
      // Get the output variable for the given dataset key; if the variable doesn't
      // exist in this version of the model/bundle, just skip it
      const outputVar = this.modelSpec.outputVars.get(datasetKey)
      if (!outputVar) {
        continue
      }

      if (outputVar.sourceName === undefined) {
        // See if we have data for the requested model output variable
        const series = this.outputs.getSeriesForVar(outputVar.varId)
        if (series) {
          datasetMap.set(datasetKey, datasetFromPoints(series.points))
        }
      } else {
        console.error('Static data sources not yet handled in default model check bundle')
      }
    }

    return {
      datasetMap,
      modelRunTime
    }
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
async function initBundleModel(modelSpec: ModelSpec): Promise<BundleModel> {
  // Initialize the Wasm model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file
  const modelRunner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Create an `Input` instance for each input variable in the config
  const inputs: Input[] = []
  for (const inputSpec of coreConfig.inputs.values()) {
    const input = createModelInput(inputSpec)
    inputs.push(input)
  }

  // Return a `BundleModel` that wraps the underlying config and Wasm model
  return new BundleModel(modelSpec, modelRunner)
}

/**
 * Create a `Dataset` containing the given data points from the model.
 */
export function datasetFromPoints(points: Point[]): Dataset {
  const dataMap = new Map()
  for (const point of points) {
    // We omit points that have an undefined value.  SDE represents `:NA:` values as
    // a special value (`-DBL_MAX`); the `runtime` package detects these and converts
    // them to undefined instead.  We don't need them to appear in graphs, so omit them.
    if (point.y !== undefined) {
      dataMap.set(point.x, point.y)
    }
  }
  return dataMap
}

/**
 * Return a `Bundle` that can be used for running comparisons between two
 * bundles containing different versions of the sample model.
 */
export function createBundle(): Bundle {
  // Gather information about the input and output variables used in the model
  const inputVars = getInputVars()
  const outputVars = getOutputVars(modelVersion)

  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars,
    outputVars,
    implVars: new Map(),
    inputGroups: new Map(),
    datasetGroups: new Map(),
    startTime,
    endTime
  }

  return {
    version: VERSION,
    modelSpec,
    initModel: () => {
      return initBundleModel(modelSpec)
    }
  }
}
