// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// This module defines the contract between the `ModelRunner` running in the main
// thread (see `../runner.ts`) and the model worker running in the worker thread
// (see `../worker.ts`).
//

/**
 * The worker exposes two methods to the runner:
 *
 *   - `initModel()` initializes the generated model in the worker thread and
 *     returns an `InitResult` containing the model metadata.
 *   - `runModel(ioBuffer)` runs the model using the I/O parameters in the given
 *     buffer (which is transferred, not copied, in both directions).
 */

/**
 * The model metadata that is sent from the worker to the runner after the model
 * has been initialized in the worker thread.
 * @hidden
 */
export interface InitResult {
  /** The IDs of the output variables, in the order that they appear in the output buffer. */
  outputVarIds: string[]
  /** The model listing, if it was included in the generated model. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelListing?: /*ModelListingSpecs*/ any
  /** The start time (year) of the model. */
  startTime: number
  /** The end time (year) of the model. */
  endTime: number
  /** The frequency at which output values are saved. */
  saveFreq: number
  /** The number of elements in a single row of the output buffer. */
  outputRowLength: number
}
