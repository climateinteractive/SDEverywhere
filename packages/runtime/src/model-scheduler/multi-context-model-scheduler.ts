// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { DataMap, InputValue, Outputs, OutputVarId, Series, SourceName } from '../_shared'
import type { ModelRunner } from '../model-runner'

/**
 * Defines a context that holds a distinct set of model inputs and outputs.
 * These inputs and outputs are kept separate from those in other contexts,
 * which allows an application to use the same underlying model instance
 * with multiple sets of inputs and outputs.
 */
export interface ModelContext {
  /**
   * Called when the outputs have been updated after a model run.
   */
  onOutputsChanged?: () => void

  /**
   * Return the series data for the given model output variable or external
   * dataset.
   *
   * @param varId The ID of the output variable associated with the data.
   * @param sourceName The external data source name (e.g. "Ref"), or
   * undefined to use the latest model output data from this context.
   */
  getSeriesForVar(varId: OutputVarId, sourceName?: SourceName): Series | undefined
}

/**
 * A high-level interface that schedules running of the underlying `ModelRunner`.
 *
 * This class is similar to the (single context) `ModelScheduler` class, except
 * this one supports multiple contexts, each with its own distinct set of
 * inputs and outputs.  This is useful for running the same underlying model
 * instance with different sets of inputs and outputs.  For example, you can
 * use this to show the outputs for multiple scenarios in a single graph or
 * in different graphs.
 *
 * When input values are changed in one or more contexts, this class will schedule
 * a model run for each changed context to be completed as soon as possible.
 * When the model run has completed, the context's `onOutputsChanged` function
 * is called to notify that new output data is available for that context.
 *
 * The `ModelRunner` is pluggable to allow for running the model synchronously
 * (on the main JavaScript thread) or asynchronously (in a Web Worker or Node.js
 * worker thread).
 */
export class MultiContextModelScheduler {
  /** The second array that holds a stable copy of the user inputs. */
  private currentInputs: number[]

  /** The contexts that hold distinct sets of inputs and outputs. */
  private readonly contexts: ModelContextImpl[] = []

  /** Whether a model run has been scheduled. */
  private runNeeded = false

  /** Whether a model run is in progress. */
  private runInProgress = false

  /**
   * @param runner The model runner.
   * @param initialOutputs An `Outputs` instance that will be reused for the initial
   * context (this can be undefined).
   */
  constructor(private readonly runner: ModelRunner, private initialOutputs?: Outputs) {
    if (initialOutputs === undefined) {
      this.initialOutputs = runner.createOutputs()
    }
  }

  /**
   * Return true if the scheduler has started any model runs.
   */
  public isStarted(): boolean {
    return this.initialOutputs === undefined
  }

  /**
   * Add a new context that holds a distinct set of model inputs and outputs.
   * These inputs and outputs are kept separate from those in other contexts,
   * which allows an application to use the same underlying model to run with
   * multiple I/O contexts.
   *
   * Note that contexts created before the first scheduled model run will
   * inherit the baseline/reference scenario outputs as a memory-saving
   * measure, but contexts created after that first run will initially have
   * output values set to zero.
   *
   * @param inputs The input values, in the same order as in the spec file passed to `sde`.
   * @param externalData Additional data that is external to the model outputs.
   * For example, this can contain data that was captured from an initial reference
   * run, or other static data that is displayed in graphs alongside the model
   * output data in graphs.
   */
  public addContext(inputs: InputValue[], externalData?: DataMap): ModelContext {
    // If we haven't yet performed the initial scheduled model run, use the output
    // data from the baseline/reference run, otherwise initialize a new instance
    let outputs: Outputs
    if (this.initialOutputs !== undefined) {
      if (this.contexts.length === 0) {
        // For the first context, use the initial outputs by reference
        outputs = this.initialOutputs
      } else {
        // For all other contexts, create a copy of the initial outputs
        outputs = this.runner.createOutputs()
        for (const varId of outputs.varIds) {
          const series0 = this.initialOutputs.getSeriesForVar(varId)
          const series1 = outputs.getSeriesForVar(varId)
          for (let i = 0; i < series0.points.length; i++) {
            series1.points[i].y = series0.points[i].y
          }
        }
      }
    } else {
      // Initialize a new instance (with values set to zero)
      outputs = this.runner.createOutputs()
    }

    // Create the context
    const context = new ModelContextImpl(inputs, outputs, externalData)

    // When any input has an updated value, schedule a model run on the next tick
    const afterSet = () => {
      context.runNeeded = true
      this.runModelIfNeeded()
    }
    for (const input of inputs) {
      input.callbacks.onSet = afterSet
    }

    // Add to the set of contexts managed by the scheduler
    this.contexts.push(context)

    return context
  }

  /**
   * Remove the given context from the set of contexts managed by the scheduler.
   *
   * @param context The context to remove.
   */
  public removeContext(context: ModelContext): void {
    const index = this.contexts.findIndex(c => c === context)
    if (index >= 0) {
      this.contexts.splice(index, 1)
    }
  }

  /**
   * Schedule a model run (if not already pending).  When the run is
   * complete, save the outputs and call the `onOutputsChanged` callback.
   */
  private runModelIfNeeded(): void {
    // Set a flag indicating that a new run is needed (even if one is already
    // in progress)
    this.runNeeded = true

    if (this.runInProgress) {
      // A run is already in progress; let it finish first
      return
    } else {
      // A run is not already in progress, so schedule it now.  We use
      // `setTimeout` so that if a lot of inputs are all changing at once
      // (like after a reset), we wait for all those `set` or `reset`
      // calls to finish before gathering the input values into an array
      // and initiating the run on the next tick.
      this.runInProgress = true
      setTimeout(() => {
        // Kick off the (possibly asynchronous) model run
        this.runModelNow()
      }, 0)
    }
  }

  /**
   * Run the model asynchronously for all relevant contexts.
   */
  private async runModelNow(): Promise<void> {
    // Invalidate the initial outputs
    this.initialOutputs = undefined

    // Run the model for each context that requested a run
    for (const context of this.contexts) {
      if (context.runNeeded) {
        context.runNeeded = false
        await this.runModelNowForContext(context)
      }
    }

    // See if another run is needed
    if (this.runNeeded) {
      // Keep `runInProgress` set, but clear the `runNeeded` flag
      this.runNeeded = false
      setTimeout(() => {
        this.runModelNow()
      }, 0)
    } else {
      // No run needed, so clear both flags
      this.runNeeded = false
      this.runInProgress = false
    }
  }

  /**
   * Run the model asynchronously using the current set of input values in the given context.
   *
   * @param context The context to use for the model run.
   */
  private async runModelNowForContext(context: ModelContextImpl): Promise<void> {
    // If not already initialized, create a second array (that is shared for all
    // contexts) to hold a stable copy of the user inputs during model runs
    if (this.currentInputs === undefined) {
      this.currentInputs = Array(context.inputsArray.length)
    }

    // Copy the current inputs into a separate array; this ensures that the
    // following model runs all use the same inputs, even if the user continues
    // to change the inputs while the model is being run asynchronously
    for (let i = 0; i < context.inputsArray.length; i++) {
      this.currentInputs[i] = context.inputsArray[i].get()
    }

    // Run the model with the current set of input values and save the outputs
    try {
      // Perform the model run
      await this.runner.runModel(this.currentInputs, context.outputs)

      // Notify that the outputs have been updated
      context.onOutputsChanged?.()
    } catch (e) {
      console.error('ERROR: The scheduler encountered an error when running the model:', e)
    }
  }
}

class ModelContextImpl implements ModelContext {
  /**
   * A copy of the `inputs` array that was passed to `addContext`.
   * @hidden This is intended for use by `ModelScheduler` only.
   */
  public readonly inputsArray: InputValue[]

  /**
   * The structure into which the model outputs will be stored.
   * @hidden This is intended for use by `ModelScheduler` only.
   */
  public readonly outputs: Outputs

  /**
   * Whether a model run is needed for this context.
   * @hidden This is intended for use by `ModelScheduler` only.
   */
  public runNeeded = false

  /**
   * Called when the outputs have been updated after a model run.
   */
  public onOutputsChanged?: () => void

  /**
   * @hidden This is intended for use by `Model` only.
   *
   * @param inputs The input values, in the same order as in the spec file passed to `sde`.
   * @param outputs The structure into which the model outputs will be stored.
   * @param externalData Additional data that is external to the model outputs.  For example, this can contain
   * data that was captured from an initial reference run, or other static data that is displayed in graphs
   * alongside the model output data in graphs.
   */
  constructor(inputs: InputValue[], outputs: Outputs, private readonly externalData: DataMap) {
    this.inputsArray = Array.from(inputs)
    this.outputs = outputs
  }

  /**
   * Return the series data for the given model output variable or external
   * dataset.
   *
   * @param varId The ID of the output variable associated with the data.
   * @param sourceName The external data source name (e.g. "Ref"), or
   * undefined to use the latest model output data from this context.
   */
  public getSeriesForVar(varId: OutputVarId, sourceName?: SourceName): Series | undefined {
    if (sourceName === undefined) {
      // Return the latest model output data
      return this.outputs.getSeriesForVar(varId)
    } else {
      const dataForSource = this.externalData.get(sourceName)
      if (dataForSource !== undefined) {
        // Return the external data
        return dataForSource.get(varId)
      } else {
        // No data found for the given source name
        return undefined
      }
    }
  }
}
