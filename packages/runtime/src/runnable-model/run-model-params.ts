// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { indicesPerVariable, type InputValue, type Outputs, type VarSpec } from '../_shared'

/**
 * Encapsulates the parameters that are passed to a `runModel` call.
 */
export interface RunModelParams {
  /**
   * Return the inputs array.
   */
  getInputs(): Float64Array | undefined

  /**
   * Return the input indices array, or undefined if the indices are not active (i.e.,
   * if they were not included in the most recent update).
   */
  getInputIndices(): Int32Array | undefined

  /**
   * Return the outputs array.
   */
  getOutputs(): Float64Array | undefined

  /**
   * Return the output indices array, or undefined if the indices are not active (i.e.,
   * if they were not included in the most recent update).
   */
  getOutputIndices(): Int32Array | undefined
}

/**
 * Default implementation of `RunModelParams` that holds the input and output arrays by
 * reference.  It avoids copying of data when possible.  This implementation is best
 * used with a synchronous `ModelRunner`.
 */
export class ReferencedRunModelParams implements RunModelParams {
  private inputs: Float64Array
  private inputIndices: Int32Array
  private inputIndicesActive: boolean
  private outputs: Float64Array
  private outputIndices: Int32Array
  private outputIndicesActive: boolean

  // from RunModelParams interface
  getInputs(): Float64Array | undefined {
    return this.inputs
  }

  // from RunModelParams interface
  getInputIndices(): Int32Array | undefined {
    return this.inputIndicesActive ? this.inputIndices : undefined
  }

  // from RunModelParams interface
  getOutputs(): Float64Array | undefined {
    return this.outputs
  }

  // from RunModelParams interface
  getOutputIndices(): Int32Array | undefined {
    return this.outputIndicesActive ? this.outputIndices : undefined
  }

  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values. Unless `options.inputVarSpecs` is defined, these
   * input values must be in the same order as in the spec file.
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   */
  updateFromParams(inputs: (number | InputValue)[], outputs: Outputs, options?: RunModelOptions): void {
    // // Update the input indices, if needed
    // // TODO: Throw an error if inputs.length is less than inputVarSpecs.length
    // const inputVarSpecs = options?.inputVarSpecs
    // if (inputVarSpecs !== undefined && inputVarSpecs.length > 0) {
    //   // Allocate (or reallocate) the `WasmBuffer` into which the input indices will be copied
    //   const requiredInputIndicesLength = (inputVarSpecs.length + 1) * indicesPerVariable
    //   if (this.inputIndices === undefined || this.inputIndices.length < requiredInputIndicesLength) {
    //     this.inputIndices = new Int32Array(requiredInputIndicesLength)
    //     inputIndicesArray = inputIndicesBuffer.getArrayView()
    //   }
    //   updateVarIndices(inputIndicesArray, inputVarSpecs)
    //   this.inputIndicesActive = true
    // } else {
    //   // Don't use the input indices buffer when input var specs are not provided
    //   this.inputIndicesActive = false
    // }

    // Allocate (or reallocate) the array into which the inputs will be copied
    if (this.inputs === undefined || this.inputs.length < inputs.length) {
      this.inputs = new Float64Array(inputs.length)
    }

    // Copy the input values into the internal buffer
    // TODO: This step is probably not strictly necessary, but ensures that the values are captured
    // and stable for the duration of the model run in the case of an asynchronous model runner
    // TODO: Throw an error if inputs.length is less than number of inputs declared
    // in the spec (only in the case where useInputIndices is false)
    for (let i = 0; i < inputs.length; i++) {
      // XXX: The `inputs` array type used to be declared as `InputValue[]`, so some users
      // may be relying on that, but it has now been simplified to `number[]`.  For the time
      // being, we will allow for either type and choose which one depending on the shape of
      // the array elements.
      const input = inputs[i]
      if (typeof input === 'number') {
        this.inputs[i] = input
      } else {
        this.inputs[i] = input.get()
      }
    }
  }
}

// const headerOffsetInBytes = 0
const headerLengthInElements = 8
// const headerLengthInBytes = headerLengthInElements * Int32Array.BYTES_PER_ELEMENT

interface Section<ArrayType> {
  /** The view on the section of the `encoded` buffer, or undefined if the section is empty. */
  view?: ArrayType

  /** The byte offset of the section. */
  offsetInBytes: number

  /** The length (in elements) of the section. */
  lengthInElements: number
}

/**
 * An implementation of `RunModelParams` that copies the input and output arrays into a single,
 * combined buffer.  This implementation is best used with an asynchronous `ModelRunner`
 * implementation because the buffer can be transferred to/from a Web Worker or Node.js worker thread.
 */
export class BufferedRunModelParams implements RunModelParams {
  /**
   * The array that holds all input and output values.  This is grown as needed.  The memory
   * layout of the buffer is as follows:
   *   header
   *   inputs
   *   inputIndices
   *   outputs
   *   outputIndices
   */
  private encoded: ArrayBuffer

  /**
   * The header section of the `encoded` buffer.  The header declares the byte offset and length
   * (in elements) of each section of the buffer.  The memory layout of the header is as follows:
   *   0: inputs byte offset
   *   1: inputs length (in elements)
   *   2: input indices byte offset
   *   3: input indices length (in elements)
   *   4: outputs byte offset
   *   5: outputs length (in elements)
   *   6: output indices byte offset
   *   7: output indices length (in elements)
   */
  private header: Section<Int32Array>

  /** The inputs section of the `encoded` buffer. */
  private inputs: Section<Float64Array>

  /** The input indices section of the `encoded` buffer. */
  private inputIndices: Section<Int32Array>

  /** The outputs section of the `encoded` buffer. */
  private outputs: Section<Float64Array>

  /** The output indices section of the `encoded` buffer. */
  private outputIndices: Section<Int32Array>

  /**
   * Return the encoded buffer from this instance, which can be passed to `updateFromEncodedBuffer`.
   */
  getEncodedBuffer(): ArrayBuffer {
    return this.encoded
  }

  // from RunModelParams interface
  getInputs(): Float64Array | undefined {
    return this.inputs?.view
  }

  // from RunModelParams interface
  getInputIndices(): Int32Array | undefined {
    // return this.inputIndicesActive ? this.inputIndices : undefined
    return undefined // TODO
  }

  // from RunModelParams interface
  getOutputs(): Float64Array | undefined {
    return this.outputs?.view
  }

  // from RunModelParams interface
  getOutputIndices(): Int32Array | undefined {
    // return this.outputIndicesActive ? this.outputIndices : undefined
    return undefined // TODO
  }

  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values. Unless `options.inputVarSpecs` is defined, these
   * input values must be in the same order as in the spec file.
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   */
  updateFromParams(inputs: (number | InputValue)[], outputs: Outputs, options?: RunModelOptions): void {
    // Determine the number of elements in each section
    const inputsLengthInElements = inputs.length
    const inputIndicesLengthInElements = 0 // TODO
    const outputsLengthInElements = outputs.varIds.length * outputs.seriesLength
    const outputIndicesLengthInElements = 0 // TODO

    // Compute the byte offset and byte length of each section
    let byteOffset = 0
    function section(kind: 'float64' | 'int32', lengthInElements: number, pad = true): [number, number] {
      // Start at the current byte offset
      const sectionOffsetInBytes = byteOffset

      // Add some extra space at the end of each section to allow for sections to grow without
      // having to reallocate the entire buffer
      const growthFactor = pad ? 1.2 : 1

      // Compute the section length.  We round up to ensure 8 byte alignment, which is needed in order
      // for each section's start offset to be aligned correctly.
      const bytesPerElement = kind === 'float64' ? Float64Array.BYTES_PER_ELEMENT : Int32Array.BYTES_PER_ELEMENT
      const requiredSectionLengthInBytes = Math.round(lengthInElements * bytesPerElement * growthFactor)
      const alignedSectionLengthInBytes = Math.ceil(requiredSectionLengthInBytes / 8) * 8
      byteOffset += alignedSectionLengthInBytes
      return [sectionOffsetInBytes, alignedSectionLengthInBytes]
    }
    const [headerOffsetInBytes, headerLengthInBytes] = section('int32', headerLengthInElements, /*pad=*/ false)
    const [inputsOffsetInBytes, inputsLengthInBytes] = section('float64', inputsLengthInElements)
    const [inputIndicesOffsetInBytes, inputIndicesLengthInBytes] = section('int32', inputIndicesLengthInElements)
    const [outputsOffsetInBytes, outputsLengthInBytes] = section('float64', outputsLengthInElements)
    const [outputIndicesOffsetInBytes, outputIndicesLengthInBytes] = section('int32', outputIndicesLengthInElements)

    // Compute the total byte length
    const requiredLengthInBytes =
      headerLengthInBytes +
      inputsLengthInBytes +
      inputIndicesLengthInBytes +
      outputsLengthInBytes +
      outputIndicesLengthInBytes

    // Create or grow the buffer, if needed
    // let forceUpdateSections = false
    if (this.encoded === undefined || this.encoded.byteLength < requiredLengthInBytes) {
      this.encoded = new ArrayBuffer(requiredLengthInBytes)

      // Recreate the header view when the buffer changes
      this.header = this.createInt32Section(headerOffsetInBytes, headerLengthInElements)

      // Force the section views to be recreated when the buffer changes
      // forceUpdateSections = true
    }

    // Update the header
    const headerView = this.header.view
    headerView[0] = inputsOffsetInBytes
    headerView[1] = inputsLengthInElements
    headerView[2] = inputIndicesOffsetInBytes
    headerView[3] = inputIndicesLengthInElements
    headerView[4] = outputsOffsetInBytes
    headerView[5] = outputsLengthInElements
    headerView[6] = outputIndicesOffsetInBytes
    headerView[7] = outputIndicesLengthInElements

    // Update the views
    // TODO: We can avoid creating these each time if the buffer and section offset/length hasn't changed
    this.inputs = this.createFloat64Section(inputsOffsetInBytes, inputsLengthInElements)
    this.inputIndices = this.createInt32Section(inputIndicesOffsetInBytes, inputIndicesLengthInElements)
    this.outputs = this.createFloat64Section(outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices = this.createInt32Section(outputIndicesOffsetInBytes, outputIndicesLengthInElements)

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
    this.header = this.createInt32Section(headerOffsetInBytes, headerLengthInElements)

    // Get the section offsets and lengths from the header
    const headerView = this.header.view
    const inputsOffsetInBytes = headerView[0]
    const inputsLengthInElements = headerView[1]
    const inputIndicesOffsetInBytes = headerView[2]
    const inputIndicesLengthInElements = headerView[3]
    const outputsOffsetInBytes = headerView[4]
    const outputsLengthInElements = headerView[5]
    const outputIndicesOffsetInBytes = headerView[6]
    const outputIndicesLengthInElements = headerView[7]

    // Verify that the buffer is long enough to contain all sections
    const inputsLengthInBytes = inputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const inputIndicesLengthInBytes = inputIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const outputsLengthInBytes = outputsLengthInElements * Float64Array.BYTES_PER_ELEMENT
    const outputIndicesLengthInBytes = outputIndicesLengthInElements * Int32Array.BYTES_PER_ELEMENT
    const requiredLengthInBytes =
      headerLengthInBytes +
      inputsLengthInBytes +
      inputIndicesLengthInBytes +
      outputsLengthInBytes +
      outputIndicesLengthInBytes
    if (buffer.byteLength < requiredLengthInBytes) {
      throw new Error('Buffer must be long enough to contain sections declared in header')
    }

    // Rebuild the sections according to the section offsets and lengths in the header
    this.inputs = this.createFloat64Section(inputsOffsetInBytes, inputsLengthInElements)
    this.inputIndices = this.createInt32Section(inputIndicesOffsetInBytes, inputIndicesLengthInElements)
    this.outputs = this.createFloat64Section(outputsOffsetInBytes, outputsLengthInElements)
    this.outputIndices = this.createInt32Section(outputIndicesOffsetInBytes, outputIndicesLengthInElements)
  }

  private createInt32Section(offsetInBytes: number, lengthInElements: number): Section<Int32Array> {
    return {
      view: lengthInElements > 0 ? new Int32Array(this.encoded, offsetInBytes, lengthInElements) : undefined,
      offsetInBytes,
      lengthInElements
    }
  }

  private createFloat64Section(offsetInBytes: number, lengthInElements: number): Section<Float64Array> {
    return {
      view: lengthInElements > 0 ? new Float64Array(this.encoded, offsetInBytes, lengthInElements) : undefined,
      offsetInBytes,
      lengthInElements
    }
  }
}
