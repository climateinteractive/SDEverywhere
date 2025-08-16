// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { InputValue, InputVarId, Outputs } from '../_shared'
import type { ModelRunner } from '../model-runner'

/**
 * A high-level interface that schedules the underlying `ModelRunner`.
 *
 * When one or more input values are changed, this class will schedule a model
 * run to be completed as soon as possible.  When the model run has completed,
 * `onOutputsChanged` is called to notify that new output data is available.
 *
 * The `ModelRunner` is pluggable to allow for running the model synchronously
 * (on the main JavaScript thread) or asynchronously (in a Web Worker or Node.js
 * worker thread).
 */
export class ModelScheduler {
  /** The second array that holds a stable copy of the user inputs. */
  private readonly currentInputs: InputValue[]

  /** Whether a model run has been scheduled. */
  private runNeeded = false

  /** Whether a model run is in progress. */
  private runInProgress = false

  /** Called when `outputs` has been updated after a model run. */
  public onOutputsChanged?: (outputs: Outputs) => void

  /**
   * @param runner The model runner.
   * @param userInputs The input values, in the same order as in the spec file passed to `sde`.
   * @param outputs The structure into which the model outputs will be stored.
   */
  constructor(
    private readonly runner: ModelRunner,
    private readonly userInputs: InputValue[],
    private outputs: Outputs
  ) {
    // When any input has an updated value, schedule a model run on the next tick
    const afterSet = () => {
      this.runModelIfNeeded()
    }
    for (const userInput of userInputs) {
      userInput.callbacks.onSet = afterSet
    }

    // Create a second array to hold a stable copy of the user inputs during model runs
    this.currentInputs = []
    for (const userInput of userInputs) {
      this.currentInputs.push(createSimpleInputValue(userInput.varId))
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
   * Run the model asynchronously using the current set of input values.
   */
  private async runModelNow(): Promise<void> {
    // Copy the current inputs into a separate array; this ensures that the
    // model run uses a stable set of inputs, even if the user continues to
    // change the inputs while the model is being run asynchronously
    for (let i = 0; i < this.userInputs.length; i++) {
      this.currentInputs[i].set(this.userInputs[i].get())
    }

    // Run the model with the current set of input values and save the outputs
    try {
      this.outputs = await this.runner.runModel(this.currentInputs, this.outputs)
      this.onOutputsChanged?.(this.outputs)
    } catch (e) {
      console.error(`ERROR: Failed to run model: ${e.message}`)
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
}

/**
 * Create an `InputValue` that is only used to hold a copy of another input (no callbacks).
 * @hidden
 */
function createSimpleInputValue(varId: InputVarId): InputValue {
  let currentValue = 0
  const get = () => {
    return currentValue
  }
  const set = (newValue: number) => {
    currentValue = newValue
  }
  const reset = () => {
    set(0)
  }
  return { varId, get, set, reset, callbacks: {} }
}
