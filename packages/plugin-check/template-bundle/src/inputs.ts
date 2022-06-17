// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputVar, Scenario } from '@sdeverywhere/check-core'
import type { InputValue, InputVarId } from '@sdeverywhere/runtime'

export interface Input extends InputValue {
  v: InputVar
}

/**
 * Gather the list of input variables used in this version of the model.
 */
export function getInputVars(inputs: Map<InputVarId, Input>): Map<InputVarId, InputVar> {
  const inputVars: Map<InputVarId, InputVar> = new Map()

  for (const [key, input] of inputs.entries()) {
    inputVars.set(key, input.v)
  }

  return inputVars
}

/**
 * Set the given `InputValue` instances according to the given scenario.
 */
export function setInputsForScenario(inputs: Map<InputVarId, Input>, scenario: Scenario): void {
  function setInputToValue(input: Input, value: number): void {
    if (value < input.v.minValue) {
      // TODO: Set an error status so that the scenario is flagged as an
      // error in the UI (for now, just warn and clamp)
      console.warn(
        `WARNING: Scenario input value ${value} is < min value (${input.v.minValue}) ` +
          `for input '${input.v.varName}'`
      )
      value = input.v.minValue
    } else if (value > input.v.maxValue) {
      console.warn(
        `WARNING: Scenario input value ${value} is > max value (${input.v.maxValue}) ` +
          `for input '${input.v.varName}'`
      )
      value = input.v.maxValue
    }
    input.set(value)
  }

  function setInputToDefault(input: Input): void {
    input.reset()
  }
  function setInputToMinimum(input: Input): void {
    input.set(input.v.minValue)
  }
  function setInputToMaximum(input: Input): void {
    input.set(input.v.minValue)
  }

  function setAllToDefault(): void {
    inputs.forEach(input => input.reset())
  }
  function setAllToMinimum(): void {
    inputs.forEach(input => setInputToMinimum(input))
  }
  function setAllToMaximum(): void {
    inputs.forEach(input => setInputToMaximum(input))
  }

  // Set inputs according to the given scenario
  switch (scenario.kind) {
    case 'all-inputs': {
      switch (scenario.position) {
        case 'at-default':
          setAllToDefault()
          break
        case 'at-minimum':
          setAllToMinimum()
          break
        case 'at-maximum':
          setAllToMaximum()
          break
      }
      break
    }
    case 'settings': {
      setAllToDefault()
      for (const setting of scenario.settings) {
        const input = inputs.get(setting.inputVarId)
        if (input) {
          switch (setting.kind) {
            case 'position':
              switch (setting.position) {
                case 'at-default':
                  setInputToDefault(input)
                  break
                case 'at-minimum':
                  setInputToMinimum(input)
                  break
                case 'at-maximum':
                  setInputToMaximum(input)
                  break
                default:
                  assertNever(setting.position)
              }
              break
            case 'value':
              setInputToValue(input, setting.value)
              break
            default:
              assertNever(setting)
          }
        } else {
          console.log(`No model input for scenario input ${setting.inputVarId}`)
        }
      }
      break
    }
    default:
      assertNever(scenario)
  }
}
