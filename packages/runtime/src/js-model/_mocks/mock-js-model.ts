// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { OutputVarId, VarId, VarSpec } from '../../_shared'
import { ModelListing } from '../../model-listing'
import type { JsModel } from '../js-model'
import type { JsModelFunctions } from '../js-model-functions'
import { JsModelLookup } from '../js-model-lookup'

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export type OnEvalAux = (vars: Map<VarId, number>, lookups: Map<VarId, JsModelLookup>) => void

/**
 * @hidden This type is not part of the public API; it is exposed only for use in
 * tests in the runtime-async package.
 */
export class MockJsModel implements JsModel {
  // from JsModel interface
  public readonly kind = 'js'

  // from JsModel interface
  public readonly outputVarIds: OutputVarId[]

  // from JsModel interface
  public readonly outputVarNames: OutputVarId[]

  // from JsModel interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly modelListing?: /*ModelListingSpecs*/ any
  private readonly internalListing?: ModelListing

  private readonly initialTime: number
  private readonly finalTime: number

  private readonly vars: Map<VarId, number> = new Map()
  private readonly lookups: Map<VarId, JsModelLookup> = new Map()
  private fns: JsModelFunctions

  public readonly onEvalAux: OnEvalAux

  constructor(options: {
    initialTime: number
    finalTime: number
    outputVarIds: OutputVarId[]
    listingJson?: string
    onEvalAux: OnEvalAux
  }) {
    this.outputVarIds = options.outputVarIds
    this.outputVarNames = options.outputVarIds
    this.initialTime = options.initialTime
    this.finalTime = options.finalTime
    this.outputVarIds = options.outputVarIds
    if (options.listingJson) {
      this.modelListing = JSON.parse(options.listingJson)
      this.internalListing = new ModelListing(this.modelListing)
    }
    this.onEvalAux = options.onEvalAux
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

  // from JsModel interface
  setLookup(varSpec: VarSpec, points: Float64Array | undefined): void {
    const varId = this.varIdForSpec(varSpec)
    if (varId === undefined) {
      throw new Error(`No lookup variable found for spec ${varSpec}`)
    }
    const numPoints = points ? points.length / 2 : 0
    this.lookups.set(varId, new JsModelLookup(numPoints, points))
  }

  // from JsModel interface
  setConstant(varSpec: VarSpec, value: number): void {
    const varId = this.varIdForSpec(varSpec)
    if (varId === undefined) {
      throw new Error(`No constant variable found for spec ${varSpec}`)
    }
    this.vars.set(varId, value)
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
    this.onEvalAux?.(this.vars, this.lookups)
  }

  // from JsModel interface
  evalLevels(): void {}
}
