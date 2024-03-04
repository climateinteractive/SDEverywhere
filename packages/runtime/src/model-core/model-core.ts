// Copyright (c) 2024 Climate Interactive / New Venture Fund

export interface ModelCore {
  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveStep(): number
  setTime(time: number): void

  setInputs(inputs: number[]): void
  storeOutputs(outputs: number[], storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}
