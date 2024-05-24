// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { indicesPerVariable, updateVarIndices } from '../_shared'
import type { InputValue, LookupDef, Outputs, VarSpec } from '../_shared'
import type { RunModelOptions } from './run-model-options'
import type { RunModelParams } from './run-model-params'

const headerLengthInElements = 16
const extrasLengthInElements = 2

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

  /** The lookup data section of the `encoded` buffer. */
  private readonly lookups = new Float64Section()

  /** The lookup indices section of the `encoded` buffer. */
  private readonly lookupIndices = new Int32Section()

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
    // Copy from the given array to the internal buffer
    this.outputs.view?.set(array)
  }

  // from RunModelParams interface
  getLookups(): LookupDef[] | undefined {
    if (this.lookupIndices.lengthInElements === 0) {
      return undefined
    }

    // Reconstruct the `LookupDef` instances using the data from the lookup data and
    // indices buffers
    return decodeLookups(this.lookups.view, this.lookupIndices.view)
  }

  // from RunModelParams interface
  getStopAfterTime(): number | undefined {
    const t = this.extras.view[1]
    return isNaN(t) ? undefined : t
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
  updateFromParams(inputs: (number | InputValue)[], outputs: Outputs, options?: RunModelOptions): void {
    // Determine the number of elements in the input and output sections
    const inputsLengthInElements = inputs.length
    const outputsLengthInElements = outputs.varIds.length * outputs.seriesLength

    // Determine the number of elements in the output indices section
    let outputIndicesLengthInElements: number
    const outputVarSpecs = outputs.varSpecs
    if (outputVarSpecs !== undefined && outputVarSpecs.length > 0) {
      // The output indices buffer needs to include N elements for each var spec plus one
      // additional "zero" element as a terminator
      outputIndicesLengthInElements = (outputVarSpecs.length + 1) * indicesPerVariable
    } else {
      // Don't use the output indices buffer when output var specs are not provided
      outputIndicesLengthInElements = 0
    }

    // Determine the number of elements in the lookup data and indices sections
    let lookupsLengthInElements: number
    let lookupIndicesLengthInElements: number
    if (options?.lookups !== undefined && options.lookups.length > 0) {
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
      updateVarIndices(this.outputIndices.view, outputVarSpecs)
    }

    // Copy the lookup data and indices into the internal buffers, if needed
    if (lookupIndicesLengthInElements > 0) {
      encodeLookups(options.lookups, this.lookups.view, this.lookupIndices.view)
    }

    // Set the `stopAfterTime` value into the extras buffer
    this.extras.view[1] = options?.stopAfterTime !== undefined ? options.stopAfterTime : Number.NaN
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
    const requiredLengthInBytes =
      headerLengthInBytes +
      extrasLengthInBytes +
      inputsLengthInBytes +
      outputsLengthInBytes +
      outputIndicesLengthInBytes +
      lookupsLengthInBytes +
      lookupIndicesLengthInBytes
    if (buffer.byteLength < requiredLengthInBytes) {
      throw new Error('Buffer must be long enough to contain sections declared in header')
    }

    // Rebuild the sections according to the section offsets and lengths in the header
    this.extras.update(this.encoded, extrasOffsetInBytes, extrasLengthInElements)
    this.inputs.update(this.encoded, inputsOffsetInBytes, inputsLengthInElements)
    this.outputs.update(this.encoded, outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices.update(this.encoded, outputIndicesOffsetInBytes, outputIndicesLengthInElements)
    this.lookups.update(this.encoded, lookupsOffsetInBytes, lookupsLengthInElements)
    this.lookupIndices.update(this.encoded, lookupIndicesOffsetInBytes, lookupIndicesLengthInElements)
  }
}

/**
 * Return the lengths of the arrays that are required to store the lookup data and indices for
 * the given `LookupDef` instances.
 *
 * @param lookupDefs The `LookupDef` instances to encode.
 */
function getEncodedLookupBufferLengths(lookupDefs: LookupDef[]): {
  lookupsLength: number
  lookupIndicesLength: number
} {
  // The lookups buffer includes all data points for the provided lookup overrides
  // (added sequentially, with no padding between datasets).  The lookup indices
  // buffer has the following format:
  //   lookup count
  //   lookupN var index
  //   lookupN sub0 index
  //   lookupN sub1 index
  //   lookupN sub2 index
  //   lookupN data offset (relative to the start of the lookups buffer, in float64 elements)
  //   lookupN data length (in float64 elements)
  //   ... (repeat for each lookup)
  const numIndexElementsForTotalCount = 1
  const numIndexElementsPerLookup = 6
  let lookupsLength = 0
  let lookupIndicesLength = numIndexElementsForTotalCount
  for (const lookupDef of lookupDefs) {
    lookupsLength += lookupDef.points.length
    lookupIndicesLength += numIndexElementsPerLookup
  }
  return {
    lookupsLength,
    lookupIndicesLength
  }
}

/**
 * Encode lookup data and indices to the given buffer views.
 *
 * @param lookupDefs The `LookupDef` instances to encode.
 * @param lookupsView The view on the lookup data buffer.
 * @param lookupIndicesView The view on the lookup indices buffer.
 */
function encodeLookups(lookupDefs: LookupDef[], lookupsView: Float64Array, lookupIndicesView: Int32Array): void {
  // Store the total lookup count
  let li = 0
  lookupIndicesView[li++] = lookupDefs.length

  // Store the data and indices for each lookup
  let lookupDataOffset = 0
  for (const lookupDef of lookupDefs) {
    // Store lookup indices
    const subs = lookupDef.varSpec.subscriptIndices
    const subCount = lookupDef.varSpec.subscriptIndices?.length || 0
    lookupIndicesView[li++] = lookupDef.varSpec.varIndex
    lookupIndicesView[li++] = subCount > 0 ? subs[0] : -1
    lookupIndicesView[li++] = subCount > 1 ? subs[1] : -1
    lookupIndicesView[li++] = subCount > 2 ? subs[2] : -1
    lookupIndicesView[li++] = lookupDataOffset
    lookupIndicesView[li++] = lookupDef.points.length

    // Store lookup data
    lookupsView.set(lookupDef.points, lookupDataOffset)
    lookupDataOffset += lookupDef.points.length
  }
}

/**
 * Decode lookup data and indices from the given buffer views and return the
 * reconstruct `LookupDef` instances.
 *
 * @param lookupsView The view on the lookup data buffer.
 * @param lookupIndicesView The view on the lookup indices buffer.
 */
function decodeLookups(lookupsView: Float64Array, lookupIndicesView: Int32Array): LookupDef[] {
  const lookupDefs: LookupDef[] = []

  let li = 0
  const lookupCount = lookupIndicesView[li++]
  for (let i = 0; i < lookupCount; i++) {
    // Read the metadata from the lookup indices buffer
    const varIndex = lookupIndicesView[li++]
    const subIndex0 = lookupIndicesView[li++]
    const subIndex1 = lookupIndicesView[li++]
    const subIndex2 = lookupIndicesView[li++]
    const lookupDataOffset = lookupIndicesView[li++]
    const lookupDataLength = lookupIndicesView[li++]
    const subscriptIndices: number[] = subIndex0 >= 0 ? [] : undefined
    if (subIndex0 >= 0) subscriptIndices.push(subIndex0)
    if (subIndex1 >= 0) subscriptIndices.push(subIndex1)
    if (subIndex2 >= 0) subscriptIndices.push(subIndex2)
    const varSpec: VarSpec = {
      varIndex,
      subscriptIndices
    }

    // Copy the data from the lookup data buffer
    // TODO: We can use `subarray` here instead of `slice` and let the model implementations
    // copy the data if needed on their side
    const points = lookupsView.slice(lookupDataOffset, lookupDataOffset + lookupDataLength)
    lookupDefs.push({
      varSpec,
      points
    })
  }

  return lookupDefs
}
