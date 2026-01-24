// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { OutputVarId, VarId, VarSpec } from '../../_shared'
import { JsModelLookup } from '../../js-model/js-model-lookup'
import { ModelListing } from '../../model-listing'
import type { WasmModule } from '../wasm-module'

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export type OnRunModel = (
  inputs: Float64Array,
  outputs: Float64Array,
  constants: Map<VarId, number> | undefined,
  lookups: Map<VarId, JsModelLookup>,
  outputIndices?: Int32Array
) => void

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export class MockWasmModule implements WasmModule {
  // from WasmModule interface
  public readonly kind = 'wasm'

  // from WasmModule interface
  public readonly outputVarIds: OutputVarId[]

  // from WasmModule interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly modelListing?: any
  private readonly internalListing?: ModelListing

  private readonly initialTime: number
  private readonly finalTime: number

  private readonly heap: ArrayBuffer

  // from WasmModule interface
  public readonly HEAP32: Int32Array

  // from WasmModule interface
  public readonly HEAPF64: Float64Array

  // Start at 8 so that we can treat 0 as NULL
  private mallocOffset = 8
  private readonly allocs: Map<number, number> = new Map()

  private readonly lookups: Map<VarId, JsModelLookup> = new Map()
  private readonly constants: Map<VarId, number> = new Map()

  public readonly onRunModel: OnRunModel

  constructor(options: {
    initialTime: number
    finalTime: number
    outputVarIds: string[]
    listingJson?: string
    onRunModel: OnRunModel
  }) {
    this.initialTime = options.initialTime
    this.finalTime = options.finalTime
    this.outputVarIds = options.outputVarIds
    if (options.listingJson) {
      this.modelListing = JSON.parse(options.listingJson)
      this.internalListing = new ModelListing(this.modelListing)
    }
    this.onRunModel = options.onRunModel

    this.heap = new ArrayBuffer(8192)
    this.HEAP32 = new Int32Array(this.heap)
    this.HEAPF64 = new Float64Array(this.heap)
  }

  varIdForSpec(varSpec: VarSpec): VarId {
    for (const [listingVarId, listingSpec] of this.internalListing.varSpecs) {
      // TODO: This doesn't compare subscripts yet
      if (listingSpec.varIndex === varSpec.varIndex) {
        return listingVarId
      }
    }
    return undefined
  }

  // from WasmModule interface
  cwrap(fname: string) {
    // Return a mock implementation of each wrapped C function
    switch (fname) {
      case 'getInitialTime':
        return () => this.initialTime
      case 'getFinalTime':
        return () => this.finalTime
      case 'getSaveper':
        return () => 1
      case 'setLookup':
        return (varIndex: number, _subIndicesAddress: number, pointsAddress: number, numPoints: number) => {
          // TODO: This doesn't check subIndices yet
          const varId = this.varIdForSpec({ varIndex })
          if (varId === undefined) {
            throw new Error(`No lookup variable found for var index ${varIndex}`)
          }
          // Note that we create a copy of the points array, since it may be reused
          const points = new Float64Array(this.getHeapView('float64', pointsAddress) as Float64Array)
          this.lookups.set(varId, new JsModelLookup(numPoints, points))
        }
      case 'runModelWithBuffers':
        return (
          inputsAddress: number,
          outputsAddress: number,
          outputIndicesAddress: number,
          constantIndicesAddress: number,
          constantValuesAddress: number
        ) => {
          const inputs = this.getHeapView('float64', inputsAddress) as Float64Array
          const outputs = this.getHeapView('float64', outputsAddress) as Float64Array
          const outputIndices = this.getHeapView('int32', outputIndicesAddress) as Int32Array

          // Decode constant buffers if provided
          this.constants.clear()
          if (constantIndicesAddress !== 0 && constantValuesAddress !== 0) {
            const constantIndices = this.getHeapView('int32', constantIndicesAddress) as Int32Array
            const constantValues = this.getHeapView('float64', constantValuesAddress) as Float64Array

            // Read count
            const numConstants = constantIndices[0]
            let indicesOffset = 1
            let valuesOffset = 0

            // Decode each constant
            for (let i = 0; i < numConstants; i++) {
              const varIndex = constantIndices[indicesOffset++]
              const subCount = constantIndices[indicesOffset++]
              // TODO: We skip subscript indices for now, but we should test them here too
              indicesOffset += subCount

              const varId = this.varIdForSpec({ varIndex })
              if (varId) {
                this.constants.set(varId, constantValues[valuesOffset++])
              }
            }
          }

          // Run the model
          this.onRunModel(
            inputs,
            outputs,
            this.constants.size > 0 ? this.constants : undefined,
            this.lookups,
            outputIndices
          )

          // Clear constants after the run (they don't persist)
          this.constants.clear()
        }
      default:
        throw new Error(`Unhandled call to cwrap with function name '${fname}'`)
    }
  }

  // from WasmModule interface
  _malloc(lengthInBytes: number): number {
    const currentOffset = this.mallocOffset
    this.allocs.set(currentOffset, lengthInBytes)
    if (lengthInBytes > 0) {
      // Update the offset so that the next allocation starts after this one
      this.mallocOffset += lengthInBytes
    } else {
      // In the case where the length is zero, add a little padding so that
      // the next allocation is recorded at a different start address than
      // this one
      this.mallocOffset += 8
    }
    return currentOffset
  }

  // from WasmModule interface
  _free(): void {
    // This is not implemented; the heap will continue to grow, which is fine for the purposes of the tests
  }

  private getHeapView(kind: 'float64' | 'int32', address: number): Float64Array | Int32Array | undefined {
    if (address === 0) {
      return undefined
    }

    // Find the length
    const lengthInBytes = this.allocs.get(address)
    if (lengthInBytes === undefined) {
      throw new Error('Failed to locate heap allocation')
    }

    // The address value is in bytes, so convert to float64 or int32 offset
    if (kind === 'float64') {
      const offset = address / 8
      return this.HEAPF64.subarray(offset, offset + lengthInBytes / 8)
    } else {
      const offset = address / 4
      return this.HEAP32.subarray(offset, offset + lengthInBytes / 4)
    }
  }
}
