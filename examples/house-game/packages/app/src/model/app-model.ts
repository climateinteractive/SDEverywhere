import type { LookupDef, ModelRunner, OutputVarId, Point, Series } from '@sdeverywhere/runtime'
import { ModelListing, Outputs, createLookupDef } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import modelListingJson from './generated/listing.json?raw'
import modelWorkerJs from './generated/worker.js?raw'

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(): Promise<AppModel> {
  // Load the model listing
  const listing = new ModelListing(modelListingJson)

  // Initialize the generated model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file.
  const runner = await spawnAsyncModelRunner({ source: modelWorkerJs })
  const outputs = runner.createOutputs()

  // Create the `AppModel` instance
  return new AppModel(listing, runner, outputs)
}

/**
 * High-level interface to the runnable model.
 *
 * When an asynchronous model run has completed, the output data will be saved
 * (accessible using the `getSeriesForVar` method).
 */
export class AppModel {
  constructor(
    private readonly listing: ModelListing,
    private readonly runner: ModelRunner,
    private readonly outputs: Outputs
  ) {}

  /**
   * Create a `LookupDef` for the data variable that is updated at runtime.
   */
  public createLookupDef(points: Point[]): LookupDef {
    const varSpec = this.listing.varSpecs.get('_planning_data')
    return createLookupDef(varSpec, points)
  }

  /**
   * Schedule an asynchronous model run.  When the run completes, the data can be
   * accessed using the `getSeriesForVar` method.
   */
  public async runModel(inputs: number[], lookups?: LookupDef[]): Promise<void> {
    await this.runner.runModel(inputs, this.outputs, { lookups })
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
