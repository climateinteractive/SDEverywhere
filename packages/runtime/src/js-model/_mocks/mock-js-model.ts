// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { OutputVarId, VarId, VarSpec } from '../../_shared'
import type { ModelListing } from '../../model-listing'
import type { JsModel } from '../js-model'
import type { JsModelFunctions } from '../js-model-functions'

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export type VarIdForSpec = (varSpec: VarSpec) => VarId | undefined

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export type OnEvalAux = (vars: Map<VarId, number> /*, lookups: Map<VarId, JsModelLookup>*/) => void

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export class MockJsModel implements JsModel {
  private readonly initialTime: number
  private readonly finalTime: number
  // private readonly inputVarIds: InputVarId[]
  private readonly outputVarIds: OutputVarId[]

  private readonly vars: Map<VarId, number> = new Map()
  // private readonly lookups: Map<VarId, JsModelLookup> = new Map()
  private fns: JsModelFunctions

  private listing: ModelListing

  public readonly onEvalAux: OnEvalAux
  public readonly varIdForSpec: VarIdForSpec

  constructor(options: {
    initialTime: number
    finalTime: number
    // inputVarIds?: string[]
    outputVarIds: string[]
    varIdForSpec?: VarIdForSpec
    onEvalAux: OnEvalAux
  }) {
    this.initialTime = options.initialTime
    this.finalTime = options.finalTime
    // this.inputVarIds = options.inputVarIds
    this.outputVarIds = options.outputVarIds
    if (options.varIdForSpec) {
      // Use the provided lookup function
      this.varIdForSpec = options.varIdForSpec
    } else {
      // Use a default lookup function that relies on the `ModelListing`
      this.varIdForSpec = (varSpec: VarSpec) => {
        for (const [listingVarId, listingSpec] of this.listing.varSpecs) {
          // TODO: This doesn't compare subscripts yet
          if (listingSpec.varIndex === varSpec.varIndex) {
            return listingVarId
          }
        }
        return undefined
      }
    }
    this.onEvalAux = options.onEvalAux
  }

  setListing(listing: ModelListing) {
    this.listing = listing
  }

  // from JsModel interface
  getInitialTime(): number {
    return this.initialTime
  }

  // from JsModel interface
  getFinalTime(): number {
    return this.finalTime
  }

  // from JsModel interface
  getTimeStep(): number {
    return 1
  }

  // from JsModel interface
  getSaveFreq(): number {
    return 1
  }

  // from JsModel interface
  getModelFunctions(): JsModelFunctions {
    return this.fns
  }

  // from JsModel interface
  setModelFunctions(fns: JsModelFunctions) {
    this.fns = fns
  }

  // from JsModel interface
  setTime(time: number): void {
    this.vars.set('_time', time)
  }

  // from JsModel interface
  setInputs(): void {
    // TODO
  }

  // // from JsModel interface
  // setLookup(varSpec: VarSpec, points: Float64Array): void {
  //   const varId = this.varIdForSpec(varSpec)
  //   if (varId === undefined) {
  //     throw new Error(`No lookup variable found for spec ${varSpec}`)
  //   }
  //   this.lookups.set(varId, new JsModelLookup(points.length / 2, points))
  // }

  // from JsModel interface
  getOutputVarIds(): string[] {
    return this.outputVarIds
  }

  // from JsModel interface
  getOutputVarNames(): string[] {
    return this.outputVarIds
  }

  // from JsModel interface
  storeOutputs(storeValue: (value: number) => void): void {
    for (const varId of this.outputVarIds) {
      storeValue(this.vars.get(varId))
    }
  }

  // from JsModel interface
  storeOutput(varSpec: VarSpec, storeValue: (value: number) => void): void {
    const varId = this.varIdForSpec(varSpec)
    if (varId === undefined) {
      throw new Error(`No output variable found for spec ${varSpec}`)
    }
    storeValue(this.vars.get(varId))
  }

  // from JsModel interface
  initConstants(): void {}

  // from JsModel interface
  initLevels(): void {}

  // from JsModel interface
  evalAux(): void {
    this.onEvalAux?.(this.vars /*, this.lookups*/)
  }

  // from JsModel interface
  evalLevels(): void {}
}