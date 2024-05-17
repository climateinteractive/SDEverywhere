// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { OutputVarId, VarId } from '../../_shared'
import type { JsModel } from '../js-model'
import type { JsModelFunctions } from '../js-model-functions'

export class MockJsModel implements JsModel {
  private readonly initialTime: number
  private readonly finalTime: number
  // private readonly inputVarIds: InputVarId[]
  private readonly outputVarIds: OutputVarId[]

  private readonly vars: Map<VarId, number> = new Map()
  private fns: JsModelFunctions

  public onEvalAux: (vars: Map<VarId, number>) => void

  constructor(options: {
    initialTime: number
    finalTime: number
    // inputVarIds?: string[]
    outputVarIds: string[]
    onEvalAux: (vars: Map<VarId, number>) => void
  }) {
    this.initialTime = options.initialTime
    this.finalTime = options.finalTime
    // this.inputVarIds = options.inputVarIds
    this.outputVarIds = options.outputVarIds
    this.onEvalAux = options.onEvalAux
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

  // Model functions
  getModelFunctions(): JsModelFunctions {
    return this.fns
  }

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
  initConstants(): void {}

  // from JsModel interface
  initLevels(): void {}

  // from JsModel interface
  evalAux(): void {
    this.onEvalAux?.(this.vars)
  }

  // from JsModel interface
  evalLevels(): void {}
}
