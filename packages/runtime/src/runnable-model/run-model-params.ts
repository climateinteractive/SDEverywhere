// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { ConstantDef, LookupDef, Outputs } from '../_shared'

/**
 * Encapsulates the parameters that are passed to a `runModel` call.
 *
 * @hidden This is not yet exposed in the public API; it is currently only used by
 * the implementations of the `RunnableModel` interface.
 */
export interface RunModelParams {
  /**
   * Return the array containing the inputs, or undefined if the implementation does not
   * have the inputs readily available in an array.  If this returns undefined, use
   * `copyInputs` to copy the inputs into a provided array.
   */
  getInputs(): Float64Array | undefined

  /**
   * Copy the input values into an array.
   *
   * @param array An existing array, or undefined.  If `array` is undefined, or it is
   * not large enough to hold the input values, the `create` function will be called
   * to allocate a new array.
   * @param create A function that allocates a new `Float64Array` with the given length.
   */
  copyInputs(array: Float64Array | undefined, create: (numElements: number) => Float64Array): void

  /**
   * Return the length (in elements) of the output indices array, or 0 if the indices are
   * not active (i.e., if they were not included in the latest `runModel` call).
   */
  getOutputIndicesLength(): number

  /**
   * Return the array containing the output indices, or undefined if the implementation does not
   * have the output indices readily available in an array.  If this returns undefined, use
   * `copyOutputIndices` to copy the output indices into a provided array.
   */
  getOutputIndices(): Int32Array | undefined

  /**
   * Copy the output indices into an array.
   *
   * @param array An existing array, or undefined.  If `array` is undefined, or it is
   * not large enough to hold the input values, the `create` function will be called
   * to allocate a new array.
   * @param create A function that allocates a new `Int32Array` with the given length.
   */
  copyOutputIndices(array: Int32Array | undefined, create: (numElements: number) => Int32Array): void

  /**
   * Return the length (in elements) of the array that will receive the outputs.
   */
  getOutputsLength(): number

  /**
   * Return the array containing the outputs, or undefined if the implementation does not
   * have an array available for writing the outputs.
   */
  getOutputs(): Float64Array | undefined

  /**
   * Return the `Outputs` object, or undefined if the implementation does not keep a reference
   * to the `Outputs` object that was passed to `runModel`.
   */
  getOutputsObject(): Outputs | undefined

  /**
   * Store the output values that were written by the model.  This will be used to populate
   * the `Outputs` object that was passed to the latest `runModel` call.
   *
   * @param array The array that contains the output values.
   */
  storeOutputs(array: Float64Array): void

  /**
   * Return an array containing lookup overrides, or undefined if no lookups were passed to
   * the latest `runModel` call.
   */
  getLookups(): LookupDef[] | undefined

  /**
   * Return an array containing constant overrides, or undefined if no constants were passed
   * to the latest `runModel` call.
   */
  getConstants(): ConstantDef[] | undefined

  /**
   * Return the elapsed time (in milliseconds) of the model run.
   */
  getElapsedTime(): number

  /**
   * Store the elapsed time of the model run.
   *
   * @param elapsed The model run time, in milliseconds.
   */
  storeElapsedTime(elapsed: number): void
}
