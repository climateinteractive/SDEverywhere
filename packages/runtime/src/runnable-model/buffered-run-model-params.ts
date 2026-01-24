// Copyright (c) 2024 Climate Interactive / New Venture Fund

import {
  decodeConstants,
  decodeLookups,
  encodeConstants,
  encodeLookups,
  encodeVarIndices,
  getEncodedConstantBufferLengths,
  getEncodedLookupBufferLengths,
  getEncodedVarIndicesLength
} from '../_shared'
import type { ConstantDef, InputValue, LookupDef, Outputs } from '../_shared'
import type { ModelListing } from '../model-listing'
import { resolveVarRef } from './resolve-var-ref'
import type { RunModelOptions } from './run-model-options'
import type { RunModelParams } from './run-model-params'

const headerLengthInElements = 20
const extrasLengthInElements = 1

interface Section<ArrayType> {
  /** The view on the section of the `encoded` buffer, or undefined if the section is empty. */
  view?: ArrayType

  /** The byte offset of the section. */
  offsetInBytes: number

  /** The length (in elements) of the section. */
  lengthInElements: number

  /**
   * Update the view for this section.
   */
  update(encoded: ArrayBuffer, offsetInBytes: number, lengthInElements: number): void
}

class Int32Section implements Section<Int32Array> {
  view?: Int32Array
  offsetInBytes = 0
  lengthInElements = 0
  update(encoded: ArrayBuffer, offsetInBytes: number, lengthInElements: number): void {
    this.view = lengthInElements > 0 ? new Int32Array(encoded, offsetInBytes, lengthInElements) : undefined
    this.offsetInBytes = offsetInBytes
    this.lengthInElements = lengthInElements
  }
}

class Float64Section implements Section<Float64Array> {
  view?: Float64Array
  offsetInBytes = 0
  lengthInElements = 0
  update(encoded: ArrayBuffer, offsetInBytes: number, lengthInElements: number): void {
    this.view = lengthInElements > 0 ? new Float64Array(encoded, offsetInBytes, lengthInElements) : undefined
    this.offsetInBytes = offsetInBytes
    this.lengthInElements = lengthInElements
  }
}

/**
 * An implementation of `RunModelParams` that copies the input and output arrays into a single,
 * combined buffer.  This implementation is designed to work with an asynchronous `ModelRunner`
 * implementation because the buffer can be transferred to/from a Web Worker or Node.js worker
 * thread without copying (if it is marked `Transferable`).
 *
 * @hidden This is not yet exposed in the public API; it is currently only used by
 * the implementations of the `RunnableModel` interface.
 */
export class BufferedRunModelParams implements RunModelParams {
  /**
   * The array that holds all input and output values.  This is grown as needed.  The memory
   * layout of the buffer is as follows:
   *   header
   *   extras (holds elapsed time, etc)
   *   inputs
   *   outputs
   *   outputIndices
   *   constants (values)
   *   constantIndices
   *   lookups (data)
   *   lookupIndices
   */
  private encoded: ArrayBuffer

  /**
   * The header section of the `encoded` buffer.  The header declares the byte offset and length
   * (in elements) of each section of the buffer.
   */
  private readonly header = new Int32Section()

  /** The extras section of the `encoded` buffer (holds elapsed time, etc). */
  private readonly extras = new Float64Section()

  /** The inputs section of the `encoded` buffer. */
  private readonly inputs = new Float64Section()

  /** The outputs section of the `encoded` buffer. */
  private readonly outputs = new Float64Section()

  /** The output indices section of the `encoded` buffer. */
  private readonly outputIndices = new Int32Section()

  /** The constant values section of the `encoded` buffer. */
  private readonly constants = new Float64Section()

  /** The constant indices section of the `encoded` buffer. */
  private readonly constantIndices = new Int32Section()

  /** The lookup data section of the `encoded` buffer. */
  private readonly lookups = new Float64Section()

  /** The lookup indices section of the `encoded` buffer. */
  private readonly lookupIndices = new Int32Section()

  /**
   * @param listing The model listing that is used to locate a variable that is referenced by
   * name or identifier.  If undefined, variables cannot be referenced by name or identifier,
   * and can only be referenced using a valid `VarSpec`.
   */
  constructor(private readonly listing?: ModelListing) {}

  /**
   * Return the encoded buffer from this instance, which can be passed to `updateFromEncodedBuffer`.
   */
  getEncodedBuffer(): ArrayBuffer {
    return this.encoded
  }

  // from RunModelParams interface
  getInputs(): Float64Array | undefined {
    return this.inputs.view
  }

  // from RunModelParams interface
  copyInputs(array: Float64Array | undefined, create: (numElements: number) => Float64Array): void {
    if (this.inputs.lengthInElements === 0) {
      // Note that the inputs section will be empty if the inputs parameter is empty,
      // so we can skip copying in this case
      return
    }

    // Allocate (or reallocate) an array, if needed
    if (array === undefined || array.length < this.inputs.lengthInElements) {
      array = create(this.inputs.lengthInElements)
    }

    // Copy from the internal buffer to the array
    array.set(this.inputs.view)
  }

  // from RunModelParams interface
  getOutputIndicesLength(): number {
    return this.outputIndices.lengthInElements
  }

  // from RunModelParams interface
  getOutputIndices(): Int32Array | undefined {
    return this.outputIndices.view
  }

  // from RunModelParams interface
  copyOutputIndices(array: Int32Array | undefined, create: (numElements: number) => Int32Array): void {
    if (this.outputIndices.lengthInElements === 0) {
      // Note that the output indices section can be empty if the output indices are
      // not provided, so we can skip copying in this case
      return
    }

    // Allocate (or reallocate) an array, if needed
    if (array === undefined || array.length < this.outputIndices.lengthInElements) {
      array = create(this.outputIndices.lengthInElements)
    }

    // Copy from the internal buffer to the array
    array.set(this.outputIndices.view)
  }

  // from RunModelParams interface
  getOutputsLength(): number {
    return this.outputs.lengthInElements
  }

  // from RunModelParams interface
  getOutputs(): Float64Array | undefined {
    return this.outputs.view
  }

  // from RunModelParams interface
  getOutputsObject(): Outputs | undefined {
    // This implementation does not keep a reference to the original `Outputs` instance,
    // so we return undefined here
    return undefined
  }

  // from RunModelParams interface
  storeOutputs(array: Float64Array): void {
    if (this.outputs.view === undefined) {
      return
    }

    // Copy from the given array to the internal buffer.  Note that the given array
    // can be longer than the internal buffer.  This can happen in the case where the
    // model has an outputs buffer already allocated that was sized to accommodate a
    // certain amount of outputs, and then a later model run used a smaller amount of
    // outputs.  In this case, the model may choose to keep the reuse the buffer
    // rather than reallocate/shrink the buffer, so we need to copy a subset here.
    if (array.length > this.outputs.view.length) {
      this.outputs.view.set(array.subarray(0, this.outputs.view.length))
    } else {
      this.outputs.view.set(array)
    }
  }

  // from RunModelParams interface
  getConstants(): ConstantDef[] | undefined {
    if (this.constantIndices.lengthInElements === 0) {
      return undefined
    }

    // Reconstruct the `ConstantDef` instances using the data from the constant values and
    // indices buffers
    return decodeConstants(this.constantIndices.view, this.constants.view)
  }

  // from RunModelParams interface
  getLookups(): LookupDef[] | undefined {
    if (this.lookupIndices.lengthInElements === 0) {
      return undefined
    }

    // Reconstruct the `LookupDef` instances using the data from the lookup data and
    // indices buffers
    return decodeLookups(this.lookupIndices.view, this.lookups.view)
  }

  // from RunModelParams interface
  getElapsedTime(): number {
    return this.extras.view[0]
  }

  // from RunModelParams interface
  storeElapsedTime(elapsed: number): void {
    // Store elapsed time in the extras section
    this.extras.view[0] = elapsed
  }

  /**
   * Copy the outputs buffer to the given `Outputs` instance.  This should be called
   * after the `runModel` call has completed so that the output values are copied from
   * the internal buffer to the `Outputs` instance that was passed to `runModel`.
   *
   * @param outputs The `Outputs` instance into which the output values will be copied.
   */
  finalizeOutputs(outputs: Outputs): void {
    // Copy the output values to the `Outputs` instance
    if (this.outputs.view) {
      outputs.updateFromBuffer(this.outputs.view, outputs.seriesLength)
    }

    // Store the elapsed time value in the `Outputs` instance
    outputs.runTimeInMillis = this.getElapsedTime()
  }

  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   */
  updateFromParams(inputs: number[] | InputValue[], outputs: Outputs, options?: RunModelOptions): void {
    // Determine the number of elements in the input and output sections
    const inputsLengthInElements = inputs.length
    const outputsLengthInElements = outputs.varIds.length * outputs.seriesLength

    // Determine the number of elements in the output indices section
    let outputIndicesLengthInElements: number
    const outputVarSpecs = outputs.varSpecs
    if (outputVarSpecs !== undefined && outputVarSpecs.length > 0) {
      // Compute the required length of the output indices buffer
      outputIndicesLengthInElements = getEncodedVarIndicesLength(outputVarSpecs)
    } else {
      // Don't use the output indices buffer when output var specs are not provided
      outputIndicesLengthInElements = 0
    }

    // Determine the number of elements in the constant values and indices sections
    let constantsLengthInElements: number
    let constantIndicesLengthInElements: number
    if (options?.constants !== undefined && options.constants.length > 0) {
      // Resolve the `varSpec` for each `ConstantDef`.  If the variable can be resolved, this
      // will fill in the `varSpec` for the `ConstantDef`, otherwise it will throw an error.
      for (const constantDef of options.constants) {
        resolveVarRef(this.listing, constantDef.varRef, 'constant')
      }

      // Compute the required lengths
      const encodedLengths = getEncodedConstantBufferLengths(options.constants)
      constantsLengthInElements = encodedLengths.constantsLength
      constantIndicesLengthInElements = encodedLengths.constantIndicesLength
    } else {
      // Don't use the constant values and indices buffers when constant overrides are not provided
      constantsLengthInElements = 0
      constantIndicesLengthInElements = 0
    }

    // Determine the number of elements in the lookup data and indices sections
    let lookupsLengthInElements: number
    let lookupIndicesLengthInElements: number
    if (options?.lookups !== undefined && options.lookups.length > 0) {
      // Resolve the `varSpec` for each `LookupDef`.  If the variable can be resolved, this
      // will fill in the `varSpec` for the `LookupDef`, otherwise it will throw an error.
      for (const lookupDef of options.lookups) {
        resolveVarRef(this.listing, lookupDef.varRef, 'lookup')
      }

      // Compute the required lengths
      const encodedLengths = getEncodedLookupBufferLengths(options.lookups)
      lookupsLengthInElements = encodedLengths.lookupsLength
      lookupIndicesLengthInElements = encodedLengths.lookupIndicesLength
    } else {
      // Don't use the lookup data and indices buffers when lookup overrides are not provided
      lookupsLengthInElements = 0
      lookupIndicesLengthInElements = 0
    }

    // Compute the byte offset and byte length of each section
    let byteOffset = 0
    function section(kind: 'float64' | 'int32', lengthInElements: number): number {
      // Start at the current byte offset
      const sectionOffsetInBytes = byteOffset

      // Compute the section length.  We round up to ensure 8 byte alignment, which is needed in order
      // for each section's start offset to be aligned correctly.
      const bytesPerElement = kind === 'float64' ? Float64Array.BYTES_PER_ELEMENT : Int32Array.BYTES_PER_ELEMENT
      const requiredSectionLengthInBytes = Math.round(lengthInElements * bytesPerElement)
      const alignedSectionLengthInBytes = Math.ceil(requiredSectionLengthInBytes / 8) * 8
      byteOffset += alignedSectionLengthInBytes
      return sectionOffsetInBytes
    }
    const headerOffsetInBytes = section('int32', headerLengthInElements)
    const extrasOffsetInBytes = section('float64', extrasLengthInElements)
    const inputsOffsetInBytes = section('float64', inputsLengthInElements)
    const outputsOffsetInBytes = section('float64', outputsLengthInElements)
    const outputIndicesOffsetInBytes = section('int32', outputIndicesLengthInElements)
    const constantsOffsetInBytes = section('float64', constantsLengthInElements)
    const constantIndicesOffsetInBytes = section('int32', constantIndicesLengthInElements)
    const lookupsOffsetInBytes = section('float64', lookupsLengthInElements)
    const lookupIndicesOffsetInBytes = section('int32', lookupIndicesLengthInElements)

    // Get the total byte length
    const requiredLengthInBytes = byteOffset

    // Create or grow the buffer, if needed
    if (this.encoded === undefined || this.encoded.byteLength < requiredLengthInBytes) {
      // Add some extra space at the end of the buffer to allow for sections to grow a bit without
      // having to reallocate the entire buffer
      const totalLengthInBytes = Math.ceil(requiredLengthInBytes * 1.2)
      this.encoded = new ArrayBuffer(totalLengthInBytes)

      // Recreate the header view when the buffer changes
      this.header.update(this.encoded, headerOffsetInBytes, headerLengthInElements)
    }

    // Update the header
    const headerView = this.header.view
    let headerIndex = 0
    headerView[headerIndex++] = extrasOffsetInBytes
    headerView[headerIndex++] = extrasLengthInElements
    headerView[headerIndex++] = inputsOffsetInBytes
    headerView[headerIndex++] = inputsLengthInElements
    headerView[headerIndex++] = outputsOffsetInBytes
    headerView[headerIndex++] = outputsLengthInElements
    headerView[headerIndex++] = outputIndicesOffsetInBytes
    headerView[headerIndex++] = outputIndicesLengthInElements
    headerView[headerIndex++] = constantsOffsetInBytes
    headerView[headerIndex++] = constantsLengthInElements
    headerView[headerIndex++] = constantIndicesOffsetInBytes
    headerView[headerIndex++] = constantIndicesLengthInElements
    headerView[headerIndex++] = lookupsOffsetInBytes
    headerView[headerIndex++] = lookupsLengthInElements
    headerView[headerIndex++] = lookupIndicesOffsetInBytes
    headerView[headerIndex++] = lookupIndicesLengthInElements

    // Update the views
    // TODO: We can avoid recreating the views every time if buffer and section offset/length
    // haven't changed
    this.inputs.update(this.encoded, inputsOffsetInBytes, inputsLengthInElements)
    this.extras.update(this.encoded, extrasOffsetInBytes, extrasLengthInElements)
    this.outputs.update(this.encoded, outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices.update(this.encoded, outputIndicesOffsetInBytes, outputIndicesLengthInElements)
    this.constants.update(this.encoded, constantsOffsetInBytes, constantsLengthInElements)
    this.constantIndices.update(this.encoded, constantIndicesOffsetInBytes, constantIndicesLengthInElements)
    this.lookups.update(this.encoded, lookupsOffsetInBytes, lookupsLengthInElements)
    this.lookupIndices.update(this.encoded, lookupIndicesOffsetInBytes, lookupIndicesLengthInElements)

    // Copy the input values into the internal buffer
    // TODO: Throw an error if inputs.length is less than number of inputs declared
    // in the spec (only in the case where useInputIndices is false)
    const inputsView = this.inputs.view
    for (let i = 0; i < inputs.length; i++) {
      // XXX: The `inputs` array type used to be declared as `InputValue[]`, so some users
      // may be relying on that, but it has now been simplified to `number[]`.  For the time
      // being, we will allow for either type and choose which one depending on the shape of
      // the array elements.
      const input = inputs[i]
      if (typeof input === 'number') {
        inputsView[i] = input
      } else {
        inputsView[i] = input.get()
      }
    }

    // Copy the the output indices into the internal buffer, if needed
    if (this.outputIndices.view) {
      encodeVarIndices(outputVarSpecs, this.outputIndices.view)
    }

    // Copy the constant values and indices into the internal buffers, if needed
    if (constantIndicesLengthInElements > 0) {
      encodeConstants(options.constants, this.constantIndices.view, this.constants.view)
    }

    // Copy the lookup data and indices into the internal buffers, if needed
    if (lookupIndicesLengthInElements > 0) {
      encodeLookups(options.lookups, this.lookupIndices.view, this.lookups.view)
    }
  }

  /**
   * Update this instance using the values contained in the encoded buffer from another
   * `BufferedRunModelParams` instance.
   *
   * @param buffer An encoded buffer returned by `getEncodedBuffer`.
   */
  updateFromEncodedBuffer(buffer: ArrayBuffer): void {
    // Verify that the buffer is long enough to contain the header section
    const headerLengthInBytes = headerLengthInElements * Int32Array.BYTES_PER_ELEMENT
    if (buffer.byteLength < headerLengthInBytes) {
      throw new Error('Buffer must be long enough to contain header section')
    }

    // Set the buffer
    this.encoded = buffer

    // Rebuild the header
    const headerOffsetInBytes = 0
    this.header.update(this.encoded, headerOffsetInBytes, headerLengthInElements)

    // Get the section offsets and lengths from the header
    const headerView = this.header.view
    let headerIndex = 0
    const extrasOffsetInBytes = headerView[headerIndex++]
    const extrasLengthInElements = headerView[headerIndex++]
    const inputsOffsetInBytes = headerView[headerIndex++]
    const inputsLengthInElements = headerView[headerIndex++]
    const outputsOffsetInBytes = headerView[headerIndex++]
    const outputsLengthInElements = headerView[headerIndex++]
    const outputIndicesOffsetInBytes = headerView[headerIndex++]
    const outputIndicesLengthInElements = headerView[headerIndex++]
    const constantsOffsetInBytes = headerView[headerIndex++]
    const constantsLengthInElements = headerView[headerIndex++]
    const constantIndicesOffsetInBytes = headerView[headerIndex++]
    const constantIndicesLengthInElements = headerView[headerIndex++]
    const lookupsOffsetInBytes = headerView[headerIndex++]
    const lookupsLengthInElements = headerView[headerIndex++]
    const lookupIndicesOffsetInBytes = headerView[headerIndex++]
    const lookupIndicesLengthInElements = headerView[headerIndex++]

    // Verify that the buffer is long enough to contain all sections
    const extrasLengthInBytes = extrasLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const inputsLengthInBytes = inputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const outputsLengthInBytes = outputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const outputIndicesLengthInBytes = outputIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const lookupsLengthInBytes = lookupsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const lookupIndicesLengthInBytes = lookupIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const constantsLengthInBytes = constantsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const constantIndicesLengthInBytes = constantIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const requiredLengthInBytes =
      headerLengthInBytes +
      extrasLengthInBytes +
      inputsLengthInBytes +
      outputsLengthInBytes +
      outputIndicesLengthInBytes +
      lookupsLengthInBytes +
      lookupIndicesLengthInBytes +
      constantsLengthInBytes +
      constantIndicesLengthInBytes
    if (buffer.byteLength < requiredLengthInBytes) {
      throw new Error('Buffer must be long enough to contain sections declared in header')
    }

    // Rebuild the sections according to the section offsets and lengths in the header
    this.extras.update(this.encoded, extrasOffsetInBytes, extrasLengthInElements)
    this.inputs.update(this.encoded, inputsOffsetInBytes, inputsLengthInElements)
    this.outputs.update(this.encoded, outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices.update(this.encoded, outputIndicesOffsetInBytes, outputIndicesLengthInElements)
    this.constants.update(this.encoded, constantsOffsetInBytes, constantsLengthInElements)
    this.constantIndices.update(this.encoded, constantIndicesOffsetInBytes, constantIndicesLengthInElements)
    this.lookups.update(this.encoded, lookupsOffsetInBytes, lookupsLengthInElements)
    this.lookupIndices.update(this.encoded, lookupIndicesOffsetInBytes, lookupIndicesLengthInElements)
  }
}
