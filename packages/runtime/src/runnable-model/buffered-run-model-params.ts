// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { indicesPerVariable, updateVarIndices, type InputValue, type Outputs } from '../_shared'
import type { RunModelParams } from './run-model-params'

const headerLengthInElements = 16
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
  getElapsedTime(): number {
    return this.extras.view[0]
  }

  // from RunModelParams interface
  storeElapsedTime(elapsed: number): void {
    // Store elapsed time in the extras section
    this.extras.view[0] = elapsed
  }

  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   */
  updateFromParams(inputs: (number | InputValue)[], outputs: Outputs): void {
    // Determine the number of elements in each section
    const inputsLengthInElements = inputs.length
    const outputsLengthInElements = outputs.varIds.length * outputs.seriesLength
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

    // Update the views
    // TODO: We can avoid recreating the views every time if buffer and section offset/length
    // haven't changed
    this.inputs.update(this.encoded, inputsOffsetInBytes, inputsLengthInElements)
    this.extras.update(this.encoded, extrasOffsetInBytes, extrasLengthInElements)
    this.outputs.update(this.encoded, outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices.update(this.encoded, outputIndicesOffsetInBytes, outputIndicesLengthInElements)

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

    // Verify that the buffer is long enough to contain all sections
    const extrasLengthInBytes = extrasLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const inputsLengthInBytes = inputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const outputsLengthInBytes = outputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const outputIndicesLengthInBytes = outputIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const requiredLengthInBytes =
      headerLengthInBytes +
      extrasLengthInBytes +
      inputsLengthInBytes +
      outputsLengthInBytes +
      outputIndicesLengthInBytes
    if (buffer.byteLength < requiredLengthInBytes) {
      throw new Error('Buffer must be long enough to contain sections declared in header')
    }

    // Rebuild the sections according to the section offsets and lengths in the header
    this.extras.update(this.encoded, extrasOffsetInBytes, extrasLengthInElements)
    this.inputs.update(this.encoded, inputsOffsetInBytes, inputsLengthInElements)
    this.outputs.update(this.encoded, outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices.update(this.encoded, outputIndicesOffsetInBytes, outputIndicesLengthInElements)
  }
}
