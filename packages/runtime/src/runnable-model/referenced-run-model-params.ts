// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { indicesPerVariable, updateVarIndices, type InputValue, type Outputs } from '../_shared'
import type { RunModelParams } from './run-model-params'

/**
 * An implementation of `RunModelParams` that keeps references to the `inputs` and
 * `outputs` parameters that are passed to the `runModel` function.  This implementation
 * is best used with a synchronous `ModelRunner`.
 */
export class ReferencedRunModelParams implements RunModelParams {
  private inputs: (number | InputValue)[]
  private outputs: Outputs
  private outputsLengthInElements = 0
  private outputIndicesLengthInElements = 0

  // from RunModelParams interface
  getInputs(): Float64Array | undefined {
    // This implementation does not keep a buffer of inputs, so we return undefined here
    return undefined
  }

  // from RunModelParams interface
  copyInputs(array: Float64Array | undefined, create: (numElements: number) => Float64Array): void {
    // Allocate (or reallocate) an array, if needed
    const inputsLengthInElements = this.inputs.length
    if (array === undefined || array.length < inputsLengthInElements) {
      array = create(inputsLengthInElements)
    }

    // Copy the input values into the provided array
    for (let i = 0; i < this.inputs.length; i++) {
      // XXX: The `inputs` array type used to be declared as `InputValue[]`, so some users
      // may be relying on that, but it has now been simplified to `number[]`.  For the time
      // being, we will allow for either type and choose which one depending on the shape of
      // the array elements.
      const input = this.inputs[i]
      if (typeof input === 'number') {
        array[i] = input
      } else {
        array[i] = input.get()
      }
    }
  }

  // from RunModelParams interface
  getOutputIndicesLength(): number {
    return this.outputIndicesLengthInElements
  }

  // from RunModelParams interface
  getOutputIndices(): Int32Array | undefined {
    // This implementation does not keep a buffer of indices, so we return undefined here
    return undefined
  }

  // from RunModelParams interface
  copyOutputIndices(array: Int32Array | undefined, create: (numElements: number) => Int32Array): void {
    if (this.outputIndicesLengthInElements === 0) {
      return
    }

    // Allocate (or reallocate) an array, if needed
    if (array === undefined || array.length < this.outputIndicesLengthInElements) {
      array = create(this.outputIndicesLengthInElements)
    }

    // Copy the output indices to the provided array
    updateVarIndices(array, this.outputs.varSpecs)
  }

  // from RunModelParams interface
  getOutputsLength(): number {
    return this.outputsLengthInElements
  }

  // from RunModelParams interface
  getOutputs(): Float64Array | undefined {
    // This implementation does not keep a buffer of outputs, so we return undefined here
    return undefined
  }

  // from RunModelParams interface
  getOutputsObject(): Outputs | undefined {
    return this.outputs
  }

  // from RunModelParams interface
  storeOutputs(array: Float64Array): void {
    // Update the `Outputs` instance with the values from the given array
    if (this.outputs) {
      const result = this.outputs.updateFromBuffer(array, this.outputs.seriesLength)
      if (result.isErr()) {
        throw new Error(`Failed to store outputs: ${result.error}`)
      }
    }
  }

  // from RunModelParams interface
  getElapsedTime(): number {
    return this.outputs?.runTimeInMillis
  }

  // from RunModelParams interface
  storeElapsedTime(elapsed: number): void {
    // Store the elapsed time value in the `Outputs` instance
    if (this.outputs) {
      this.outputs.runTimeInMillis = elapsed
    }
  }

  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   */
  updateFromParams(inputs: (number | InputValue)[], outputs: Outputs): void {
    // Save the latest parameters; these values will be accessed by the `RunnableModel`
    // on demand (e.g., in the `copyInputs` method)
    this.inputs = inputs
    this.outputs = outputs
    this.outputsLengthInElements = outputs.varIds.length * outputs.seriesLength

    // See if the output indices are needed
    const outputVarSpecs = outputs.varSpecs
    if (outputVarSpecs !== undefined && outputVarSpecs.length > 0) {
      // The output indices buffer needs to include N elements for each var spec plus one
      // additional "zero" element as a terminator
      this.outputIndicesLengthInElements = (outputVarSpecs.length + 1) * indicesPerVariable
    } else {
      // Don't use the output indices buffer when output var specs are not provided
      this.outputIndicesLengthInElements = 0
    }

    // // Allocate an array that is large enough to hold the series data for each output variable
    // const requiredOutputsLength = outputs.varIds.length * outputs.seriesLength
    // if (this.outputs === undefined || this.outputs.length < requiredOutputsLength) {
    //   this.outputs = new Float64Array(requiredOutputsLength)
    // }
  }
}
