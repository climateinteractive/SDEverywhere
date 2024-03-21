// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { CoreFunctions } from './core-functions'

export interface ModelCore {
  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveFreq(): number

  getModelFunctions(): CoreFunctions
  setModelFunctions(functions: CoreFunctions): void

  setTime(time: number): void

  setData(varIndex: number, points: number[]): void

  setInputs(inputValue: (index: number) => number): void

  getOutputVarIds(): string[]
  getOutputVarNames(): string[]
  storeOutputs(storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}
