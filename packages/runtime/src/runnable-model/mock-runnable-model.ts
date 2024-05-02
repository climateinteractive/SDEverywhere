// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { OutputVarId } from '../_shared'
import { perfElapsed, perfNow } from '../perf'
import type { RunModelParams } from './run-model-params'
import type { RunnableModel } from './runnable-model'

/**
 * @hidden This is not part of the public API; for testing purposes only.
 */
export class MockRunnableModel implements RunnableModel {
  public readonly startTime: number
  public readonly endTime: number
  public readonly saveFreq: number
  public readonly numSavePoints: number
  public readonly outputVarIds: OutputVarId[]

  private inputs: Float64Array
  private outputs: Float64Array
  private outputIndices: Int32Array

  public onRunModel: (inputs: Float64Array, outputs: Float64Array, outputIndices: Int32Array | undefined) => void

  constructor(options: {
    startTime: number
    endTime: number
    saveFreq: number
    numSavePoints: number
    outputVarIds: OutputVarId[]
  }) {
    this.startTime = options.startTime
    this.endTime = options.endTime
    this.saveFreq = options.saveFreq
    this.numSavePoints = options.numSavePoints
    this.outputVarIds = options.outputVarIds
  }

  // from RunnableModel interface
  runModel(params: RunModelParams): void {
    // Get a reference to the inputs array, or copy into a new one if needed
    let inputsArray = params.getInputs()
    if (inputsArray === undefined) {
      // The inputs are not accessible in an array, so copy into a new array that we control
      params.copyInputs(this.inputs, numElements => {
        this.inputs = new Float64Array(numElements)
        return this.inputs
      })
      inputsArray = this.inputs
    }

    // Get a reference to the output indices array, or copy into a new one if needed
    let outputIndicesArray = params.getOutputIndices()
    if (outputIndicesArray === undefined && params.getOutputIndicesLength() > 0) {
      // The indices are not accessible in an array, so copy into a new array that we control
      params.copyOutputIndices(this.outputIndices, numElements => {
        this.outputIndices = new Int32Array(numElements)
        return this.outputIndices
      })
      outputIndicesArray = this.outputIndices
    }

    // Allocate (or reallocate) the array that will receive the outputs
    // TODO: If `params.getOutputsObject` returns an `Outputs` instance, we can
    // write directly into that instead of creating a separate array
    const outputsLengthInElements = params.getOutputsLength()
    if (this.outputs === undefined || this.outputs.length < outputsLengthInElements) {
      this.outputs = new Float64Array(outputsLengthInElements)
    }
    const outputsArray = this.outputs

    // Run the model
    const t0 = perfNow()
    this.onRunModel?.(inputsArray, outputsArray, outputIndicesArray)
    const elapsed = perfElapsed(t0)

    // Copy the outputs that were stored into our array back to the `RunModelParams`
    params.storeOutputs(outputsArray)

    // Store the elapsed time in the `RunModelParams`
    params.storeElapsedTime(elapsed)
  }

  // from RunnableModel interface
  terminate(): void {
    // No-op
  }
}
