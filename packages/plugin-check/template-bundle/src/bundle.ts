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
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { InputValue, InputVarId, ModelRunner, Outputs, Point } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import type { Input } from './inputs'
import { getInputVars, setInputsForScenario } from './inputs'
import { getOutputVars } from './outputs'

import { inputSpecs, outputSpecs, modelSizeInBytes, dataSizeInBytes } from 'virtual:model-spec'

import modelWorkerJs from '@_model_worker_/worker.js?raw'

// The current version of the check bundle format.  This should be
// incremented when there is an incompatible change to the bundle format.
// The model-check tools can use this value to skip tests if two bundles
// have different version numbers.
const VERSION = 1

export class BundleModel implements CheckBundleModel {
  private readonly inputs: InputValue[]
  private outputs: Outputs

  /**
   * @param modelSpec The spec for the bundled model.
   * @param inputMap The model inputs.
   * @param modelRunner The model runner.
   */
  constructor(
    public readonly modelSpec: ModelSpec,
    private readonly inputMap: Map<InputVarId, Input>,
    private readonly modelRunner: ModelRunner
  ) {
    // Derive an array of `InputValue` instances that can be passed to the runner
    this.inputs = [...inputMap.values()].map(input => input.value)

    // Create an `Outputs` instance that is initialized to hold output data
    // produced by the Wasm model
    this.outputs = modelRunner.createOutputs()
  }

  // from CheckBundleModel interface
  async getDatasetsForScenario(scenario: ScenarioSpec, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
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
async function initBundleModel(modelSpec: ModelSpec, inputMap: Map<InputVarId, Input>): Promise<BundleModel> {
  // Initialize the Wasm model asynchronously.  We inline the worker code in the
  // rolled-up bundle so that we don't have to fetch a separate `worker.js` file
  const modelRunner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Return a `BundleModel` that wraps the underlying config and Wasm model
  return new BundleModel(modelSpec, inputMap, modelRunner)
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
  const inputVars = getInputVars(inputSpecs)
  const outputVars = getOutputVars(outputSpecs)

  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars,
    outputVars,
    implVars: new Map()
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
