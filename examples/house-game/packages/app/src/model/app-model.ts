import type { LookupDef, ModelRunner, OutputVarId, Series } from '@sdeverywhere/runtime'
import { Outputs } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import modelWorkerJs from './generated/worker.js?raw'

/**
 * High-level interface to the runnable model.
 *
 * When an asynchronous model run has completed, the output data will be saved
 * (accessible using the `getSeriesForVar` function), and `onOutputsChanged` is
 * called to notify that new data is available.
 */
export class AppModel {
  /**
   * The structure into which the model outputs will be stored.
   */
  private outputs: Outputs

  /**
   * Called when the outputs have been updated after a model run.
   */
  public onOutputsChanged?: () => void

  constructor(private readonly runner: ModelRunner) {
    this.outputs = runner.createOutputs()
  }

  /**
   * Schedule an asynchronous model run.  When the run completes, the `onOutputsChanged`
   * function will be called to notify that new data is available.
   */
  public runModel(inputs: number[], lookups?: LookupDef[]): void {
    this.runner.runModel(inputs, this.outputs, { lookups }).then(() => {
      this.onOutputsChanged?.()
    })
  }

  /**
   * Return the series data for the given model output variable.
   *
   * @param varId The ID of the output variable associated with the data.
   */
  public getSeriesForVar(varId: OutputVarId): Series | undefined {
    // Return the latest model output data
    return this.outputs.getSeriesForVar(varId)
  }
}

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(): Promise<AppModel> {
  // Initialize the generated model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file.
  const runner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Create the `AppModel` instance
  return new AppModel(runner)
}
