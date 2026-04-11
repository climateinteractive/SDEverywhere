// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type {
  Dataset,
  DatasetKey,
  DatasetMap,
  DatasetsResult,
  ImplVar,
  ModelSpec,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import {
  Outputs,
  type InputValue,
  type InputVarId,
  type ModelRunner,
  type OutputVarId,
  type Point,
  type VarSpec
} from '@sdeverywhere/runtime'

import { setInputsForScenario, type Input } from './inputs'

export class BundleModelRunner {
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

  async runModelForScenario(scenario: ScenarioSpec, datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    // Set the input values according to the given scenario
    setInputsForScenario(this.inputMap, scenario)

    if (datasetKeys[0]?.startsWith('ModelImpl')) {
      // This is a batch of dataset keys corresponding to impl variables
      return this.runModelWithImplOutputs(datasetKeys)
    } else {
      // This is a batch of dataset keys corresponding to normal model outputs
      return this.runModelWithNormalOutputs(datasetKeys)
    }
  }

  private async runModelWithNormalOutputs(datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    // Run the JS model
    this.outputs = await this.modelRunner.runModel(this.inputs, this.outputs)
    const modelRunTime = this.outputs.runTimeInMillis

    // Extract the data for each requested output variable and put it into a map
    const datasetMap: DatasetMap = new Map()
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

  private async runModelWithImplOutputs(datasetKeys: DatasetKey[]): Promise<DatasetsResult> {
    // Get the `ImplVar` instances for the requested dataset keys
    const implVars: ImplVar[] = []
    for (const datasetKey of datasetKeys) {
      const implVar = this.modelSpec.implVars.get(datasetKey)
      if (implVar) {
        implVars.push(implVar)
      }
    }

    // Run the model and capture the data for the impl vars
    const startTime = this.outputs.startTime
    const endTime = this.outputs.endTime
    const saveFreq = this.outputs.saveFreq
    let implOutputs = createImplOutputs(implVars, startTime, endTime, saveFreq)
    implOutputs = await this.modelRunner.runModel(this.inputs, implOutputs)
    const modelRunTime = implOutputs.runTimeInMillis

    // Copy the data into a map
    const datasetMap: DatasetMap = new Map()
    for (const datasetKey of datasetKeys) {
      const implVar = this.modelSpec.implVars.get(datasetKey)
      const series = implOutputs.getSeriesForVar(implVar.varId)
      if (series) {
        datasetMap.set(datasetKey, datasetFromPoints(series.points))
      }
    }

    return {
      datasetMap,
      modelRunTime
    }
  }
}

/**
 * Create a `Dataset` containing the given data points from the model.
 */
function datasetFromPoints(points: Point[]): Dataset {
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

function createImplOutputs(implVars: ImplVar[], startTime: number, endTime: number, saveFreq?: number): Outputs {
  // Create a `VarSpec` for each impl variable
  const varIds: OutputVarId[] = []
  const varSpecs: VarSpec[] = []
  for (const implVar of implVars) {
    varIds.push(implVar.varId)
    varSpecs.push({
      varIndex: implVar.varIndex,
      subscriptIndices: implVar.subscriptIndices
    })
  }

  // Create a new `Outputs` instance that accepts the impl variables
  const newOutputs = new Outputs(varIds, startTime, endTime, saveFreq)
  newOutputs.varSpecs = varSpecs
  return newOutputs
}
