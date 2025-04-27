import type { InputValue, InputVarId, ModelRunner, Outputs, OutputVarId, Series } from '@sdeverywhere/runtime'
import { ModelScheduler } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'
import type { InputId } from '../config/generated/spec-types'
import { config } from '../config/config'
import type { Input } from './inputs'
import { createModelInput, createSimpleInputValue } from './inputs'
import modelWorkerJs from './generated/worker.js?raw'

/**
 * High-level interface to the runnable model.
 *
 * When one or more input values are changed, this class will schedule a model
 * run to be completed as soon as possible.  When the model run has completed,
 * the output data will be saved (accessible using the `getSeriesForVar` function),
 * and `onOutputsChanged` is called to notify that new data is available.
 */
export class Model {
  /** The model scheduler. */
  private readonly scheduler: ModelScheduler

  /**
   * The structure into which the model outputs will be stored.
   */
  private outputs: Outputs

  /**
   * Called when the outputs have been updated after a model run.
   */
  public onOutputsChanged?: () => void

  constructor(
    runner: ModelRunner,
    private readonly inputs: Map<InputVarId, Input>,
    initialOutputs: Outputs,
    private readonly refData: ReadonlyMap<OutputVarId, Series>
  ) {
    const inputsArray = Array.from(inputs.values())
    this.outputs = initialOutputs
    this.scheduler = new ModelScheduler(runner, inputsArray, initialOutputs)
    this.scheduler.onOutputsChanged = outputs => {
      this.outputs = outputs
      this.onOutputsChanged?.()
    }
  }

  /**
   * Return the model input for the given input ID, or undefined if there is
   * no input for that ID.
   */
  public getInputForId(inputId: InputId): Input | undefined {
    return this.inputs.get(inputId)
  }

  /**
   * Return the series data for the given model output variable.
   *
   * @param varId The ID of the output variable associated with the data.
   * @param sourceName The external data source name (e.g. "Ref"), or
   * undefined to use the latest model output data.
   */
  public getSeriesForVar(varId: OutputVarId, sourceName?: string): Series | undefined {
    if (sourceName === undefined) {
      // Return the latest model output data
      return this.outputs.getSeriesForVar(varId)
    } else if (sourceName === 'Ref') {
      // Return the saved reference data
      return this.refData.get(varId)
    } else {
      // TODO: Add support for static/external data
      // // Return the static external data
      // const dataset = staticData[sourceName]
      // if (dataset) {
      //   const points = dataset[varId]
      //   if (points) {
      //     return new Series(varId, points)
      //   }
      // }
      return undefined
    }
  }
}

/**
 * Create a `Model` instance.
 *
 * This is an asynchronous operation because it performs an initial
 * model run to capture the reference/baseline data.
 */
export async function createModel(): Promise<Model> {
  // Initialize the wasm model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file.
  const runner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Run the model with inputs set to their default values
  const defaultInputs: InputValue[] = []
  for (const inputSpec of config.inputs.values()) {
    defaultInputs.push(createSimpleInputValue(inputSpec.varId, inputSpec.defaultValue))
  }
  const defaultOutputs = runner.createOutputs()
  const initialOutputs = await runner.runModel(defaultInputs, defaultOutputs)

  // Capture data from the reference run for the given variables; note that we
  // must copy the series data, since the `Outputs` instance can be reused by
  // the runner and otherwise the data might be overwritten
  const refData: Map<OutputVarId, Series> = new Map()
  const refVarIds = getRefOutputs()
  for (const refVarId of refVarIds) {
    const refSeries = initialOutputs.getSeriesForVar(refVarId)
    if (refSeries) {
      refData.set(refVarId, refSeries.copy())
    } else {
      console.error(`ERROR: No reference data available for ${refVarId}`)
    }
  }

  // Create the `Model` instance
  const initialInputs = createInputs()
  return new Model(runner, initialInputs, initialOutputs, refData)
}

function createInputs(): Map<InputVarId, Input> {
  const orderedInputs: Map<InputVarId, Input> = new Map()
  for (const inputSpec of config.inputs.values()) {
    const input = createModelInput(inputSpec)
    orderedInputs.set(input.spec.id, input)
  }
  return orderedInputs
}

/**
 * Return the set of output variables that are needed for reference data.  This
 * includes output variables that appear with a "Ref" dataset in one or more
 * graph specs.
 */
function getRefOutputs(): Set<OutputVarId> {
  // Gather the set of output variables that appear with a "Ref" dataset
  // in one or more graph specs
  const refVarIds: Set<OutputVarId> = new Set()
  for (const graphSpec of config.graphs.values()) {
    for (const dataset of graphSpec.datasets) {
      if (dataset.externalSourceName === 'Ref') {
        refVarIds.add(dataset.varId)
      }
    }
  }
  return refVarIds
}
