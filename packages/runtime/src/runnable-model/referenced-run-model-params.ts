// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { InputValue, LookupDef, Outputs } from '../_shared'
import { encodeVarIndices, getEncodedVarIndicesLength } from '../_shared'
import type { ModelListing } from '../model-listing'
import { resolveVarRef } from './resolve-var-ref'
import type { RunModelOptions } from './run-model-options'
import type { RunModelParams } from './run-model-params'

/**
 * An implementation of `RunModelParams` that keeps references to the `inputs` and
 * `outputs` parameters that are passed to the `runModel` function.  This implementation
 * is best used with a synchronous `ModelRunner`.
 *
 * @hidden This is not yet exposed in the public API; it is currently only used by
 * the implementations of the `RunnableModel` interface.
 */
export class ReferencedRunModelParams implements RunModelParams {
  private inputs: number[] | InputValue[]
  private outputs: Outputs
  private outputsLengthInElements = 0
  private outputIndicesLengthInElements = 0
  private lookups: LookupDef[]

  /**
   * @param listing The model listing that is used to locate a variable that is referenced by
   * name or identifier.  If undefined, variables cannot be referenced by name or identifier,
   * and can only be referenced using a valid `VarSpec`.
   */
  constructor(private readonly listing?: ModelListing) {}

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
    encodeVarIndices(this.outputs.varSpecs, array)
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
  getLookups(): LookupDef[] | undefined {
    if (this.lookups !== undefined && this.lookups.length > 0) {
      return this.lookups
    } else {
      return undefined
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
   * @param options Additional options that influence the model run.
   */
  updateFromParams(inputs: number[] | InputValue[], outputs: Outputs, options?: RunModelOptions): void {
    // Save the latest parameters; these values will be accessed by the `RunnableModel`
    // on demand (e.g., in the `copyInputs` method)
    this.inputs = inputs
    this.outputs = outputs
    this.outputsLengthInElements = outputs.varIds.length * outputs.seriesLength
    this.lookups = options?.lookups

    if (this.lookups) {
      // Resolve the `varSpec` for each `LookupDef`.  If the variable can be resolved, this
      // will fill in the `varSpec` for the `LookupDef`, otherwise it will throw an error.
      for (const lookupDef of this.lookups) {
        resolveVarRef(this.listing, lookupDef.varRef, 'lookup')
      }
    }

    // See if the output indices are needed
    const outputVarSpecs = outputs.varSpecs
    if (outputVarSpecs !== undefined && outputVarSpecs.length > 0) {
      // Compute the required length of the output indices buffer
      this.outputIndicesLengthInElements = getEncodedVarIndicesLength(outputVarSpecs)
    } else {
      // Don't use the output indices buffer when output var specs are not provided
      this.outputIndicesLengthInElements = 0
    }
  }
}
