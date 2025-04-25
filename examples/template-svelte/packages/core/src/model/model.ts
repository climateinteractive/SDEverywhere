import type {
  DataMap,
  ModelContext as RuntimeModelContext,
  ModelRunner,
  Outputs,
  Series,
  SourceName,
  SeriesMap
} from '@sdeverywhere/runtime'
import { MultiContextModelScheduler } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import type { InputId, OutputVarId } from '../config/generated/spec-types'

import type { Config as CoreConfig } from '../config/config'
import { config as coreConfig } from '../config/config'

import { createModelInput, type Input } from './model-inputs'

import { inputVarIds } from './generated/model-spec'
import workerJs from './generated/worker.js?raw'

/**
 * Defines a context that holds a distinct set of model inputs and outputs.
 * These inputs and outputs are kept separate from those in other contexts,
 * which allows an application to use the same underlying model instance
 * with multiple sets of inputs and outputs.
 */
export interface ModelContext {
  /** The source name associated with the context. */
  sourceName: SourceName

  /** The set of inputs associated with this context. */
  inputs: Map<InputId, Input>

  /**
   * Return the series data for the given model output variable.
   *
   * @param varId The ID of the output variable associated with the data.
   */
  getSeriesForVar(varId: OutputVarId): Series | undefined
}

/**
 * The implementation of the `ModelContext` interface.
 */
interface ModelContextImpl extends ModelContext {
  /** The underlying runtime model context. */
  runtimeContext: RuntimeModelContext
}

/**
 * High-level interface to the runnable model.  This is built on top of
 * `ModelRunner` but presents a simplified interface that makes it easier
 * to work with the generated model in an application.
 *
 * When one or more input values are changed, this class will schedule a model
 * run to be completed as soon as possible.  When the model run has completed,
 * the output data will be saved (accessible using the
 * {@link Model.getSeriesForVar} method), and
 * {@link Model.onOutputsChanged} is called to notify that new data
 * is available.
 */
export class Model {
  /** The model scheduler. */
  private readonly scheduler: MultiContextModelScheduler

  /** The set of contexts. */
  private readonly contexts: Map<SourceName, ModelContext> = new Map()

  /** Called when the outputs for one or more contexts have been updated after a model run. */
  public onOutputsChanged?: () => void

  /**
   * @hidden This is intended for use by `createModel` only.
   *
   * @param coreConfig The core model configuration.
   * @param runner The model runner.
   * @param externalData Additional external/static datasets that will be available for display in graphs.
   * @param initialOutputs The outputs from the initial reference run.
   */
  constructor(
    private readonly coreConfig: CoreConfig,
    runner: ModelRunner,
    private readonly externalData: DataMap,
    initialOutputs?: Outputs
  ) {
    this.scheduler = new MultiContextModelScheduler(runner, { initialOutputs })
  }

  /**
   * Return the context for the given source name.
   */
  public getContext(sourceName: SourceName): ModelContext | undefined {
    return this.contexts.get(sourceName)
  }

  /**
   * Add a new context that holds a distinct set of model inputs and outputs.
   * These inputs and outputs are kept separate from those in other contexts,
   * which allows an application to use the same underlying model to run with
   * multiple I/O contexts.
   *
   * Note that contexts created before the first scheduled model run will
   * inherit the baseline/reference scenario outputs, but contexts created
   * after that first run will initially have output values set to zero.
   *
   * @param sourceName The name of the data source that will be associated with
   * the new context.  This name must be unique across all contexts and cannot
   * be the same as one of the source names in the `externalData` map.
   * @param options The options for the new context.
   * @param options.inputs The input values, in the same order as in the spec file passed to `sde`.
   * If undefined, a map of `Input` instances will be initialized according to the input
   * specs in the default `Config`.
   */
  public addContext(sourceName: SourceName, options?: { inputs?: Map<InputId, Input> }): ModelContext {
    if (this.contexts.has(sourceName)) {
      throw new Error(`Context with source name '${sourceName}' already exists`)
    }
    if (this.externalData.has(sourceName)) {
      throw new Error(
        `Cannot add context with source name '${sourceName}' because there is already an external data source with that name`
      )
    }

    let inputs: Map<InputId, Input>
    if (options?.inputs) {
      // Ensure that the inputs are in the order expected by the generated model
      inputs = getOrderedInputs(options.inputs)
    } else {
      // Create an `Input` instance for each input variable in the config
      inputs = new Map()
      for (const inputSpec of this.coreConfig.inputs.values()) {
        const input = createModelInput(inputSpec)
        inputs.set(input.spec.id, input)
      }
    }

    // Create a context with the underlying model scheduler
    const inputsArray = Array.from(inputs.values())
    const runtimeContext = this.scheduler.addContext(inputsArray)

    // Notify when the outputs are updated for this context
    runtimeContext.onOutputsChanged = () => {
      this.onOutputsChanged?.()
    }

    // Create the model context that provides access to the inputs and data
    const contextImpl: ModelContextImpl = {
      runtimeContext,
      sourceName,
      inputs,
      getSeriesForVar: (varId: OutputVarId) => {
        return runtimeContext.getSeriesForVar(varId)
      }
    }

    // Add the model context to the set of contexts
    this.contexts.set(sourceName, contextImpl)

    return contextImpl
  }

  /**
   * Return the series data for the given model output variable or external
   * dataset.
   *
   * @param sourceName The external data source name (e.g. "Ref") or the name of
   * the context that holds the data.
   * @param varId The ID of the output variable associated with the data.
   */
  public getSeriesForVar(sourceName: SourceName, varId: OutputVarId): Series | undefined {
    // See if there is an external data source with the given source name
    const externalData = this.externalData.get(sourceName)
    if (externalData) {
      return externalData.get(varId)
    }

    // Otherwise, see if there is a model context with the given source name
    return this.contexts.get(sourceName)?.getSeriesForVar(varId)
  }
}

/**
 * Create a `Model` instance that uses the given `ModelRunner`.
 *
 * This is an asynchronous operation because it performs an initial
 * model run to capture the reference/baseline data.
 *
 * @param runner The model runner.
 * @param options The options for the model.
 * @param options.externalData Additional external datasets that will be available for display in graphs.
 */
export async function createModel(runner: ModelRunner, options?: { externalData?: DataMap }): Promise<Model> {
  // Find all variables in the graph config that have "Ref" as the source name.
  // These are the reference/baseline datasets that will be captured in the
  // initial reference run.
  const refOutputVarIds: Set<OutputVarId> = new Set()
  for (const graphSpec of coreConfig.graphs.values()) {
    for (const datasetSpec of graphSpec.datasets.values()) {
      if (datasetSpec.externalSourceName === 'Ref') {
        refOutputVarIds.add(datasetSpec.varId)
      }
    }
  }

  // Create a map to hold the external data if one was not provided
  let externalData: DataMap
  if (options?.externalData) {
    if (externalData.has('Ref')) {
      throw new Error(`The 'externalData' map cannot contain 'Ref' data`)
    }
    externalData = options.externalData
  } else {
    externalData = new Map()
  }

  let refOutputs: Outputs
  if (refOutputVarIds.size > 0) {
    // Perform a primary reference run to capture the baseline ("Ref") data.
    // Note that we save the `Outputs` for this reference run so that initial
    // contexts are initialized with the baseline data.
    const inputs: number[] = []
    for (const inputSpec of coreConfig.inputs.values()) {
      inputs.push(inputSpec.defaultValue)
    }
    refOutputs = await runner.runModel(inputs, runner.createOutputs())

    // Capture data from the reference run for the given variables.  Note that we
    // must copy the series data, since the `Outputs` instance can be reused by
    // the runner and otherwise the data might be overwritten.
    const refData: SeriesMap = new Map()
    for (const varId of refOutputVarIds) {
      const series = refOutputs.getSeriesForVar(varId)
      if (series) {
        refData.set(varId, series.copy())
      } else {
        console.error(`ERROR: No reference data available for ${varId}`)
      }
    }
    externalData.set('Ref', refData)
  }

  // Create the `Model` instance
  return new Model(coreConfig, runner, externalData, refOutputs)
}

/**
 * Create a `ModelRunner` instance that runs the generated model
 * asynchronously in a Web Worker (in a browser context) or in a worker
 * thread (in a Node.js context).
 *
 * This asynchronous runner reduces the burden on the browser's JavaScript
 * thread and keeps the user interface more responsive when moving sliders, etc.
 *
 * This is an asynchronous operation because it loads the generated model asynchronously.
 */
export async function createAsyncModelRunner(): Promise<ModelRunner> {
  return spawnAsyncModelRunner({ source: workerJs })
}

/**
 * Create a `Model` instance that runs the generated model asynchronously
 * in a Web Worker (in a browser context) or in a worker thread (in a Node.js
 * context).
 *
 * This is an asynchronous operation because it loads the generated model asynchronously
 * and then performs an initial model run to capture the reference/baseline data.
 *
 * @param options The options for the model.
 * @param options.externalData Additional external datasets that will be available for display in graphs.
 */
export async function createAsyncModel(options?: { externalData?: DataMap }): Promise<Model> {
  // Initialize the asynchronous model runner
  const runner = await createAsyncModelRunner()

  // Create the `Model` instance that uses the asynchronous runner
  return createModel(runner, options)
}

/**
 * Ensure that the inputs are in the order expected by the generated model.
 * If the size of the given map is incorrect, this will throw an error.
 *
 * @hidden
 */
function getOrderedInputs(inputMap: Map<InputId, Input>): Map<InputId, Input> {
  if (inputMap.size !== inputVarIds.length) {
    throw new Error(`Number of inputs (${inputMap.size}) does not match list expected by model (${inputVarIds.length})`)
  }

  const unorderedInputs = Array.from(inputMap.values())
  const orderedInputs: Map<InputId, Input> = new Map()
  for (const inputVarId of inputVarIds) {
    const input = unorderedInputs.find(i => i.varId === inputVarId)
    if (!input) {
      throw new Error(`No model input found for ${inputVarId}`)
    }
    orderedInputs.set(input.spec.id, input)
  }
  return orderedInputs
}
