// Copyright (c) 2024 Climate Interactive / New Venture Fund

export interface ModelCore {
  outputVarIds: string[]

  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveFreq(): number

  setTime(time: number): void

  setInputs(inputValue: (index: number) => number): void
  storeOutputs(storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}
