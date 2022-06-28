// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputVar, Scenario } from '@sdeverywhere/check-core'
import type { InputValue, InputVarId } from '@sdeverywhere/runtime'
import { createInputValue } from '@sdeverywhere/runtime'

export interface InputSpec {
  /** The variable identifier (as used by SDEverywhere). */
  varId: string
  /** The variable name (as used in the modeling tool). */
  varName: string
  /** The default value for the input. */
  defaultValue: number
  /** The minimum value for the input. */
  minValue: number
  /** The maximum value for the input. */
  maxValue: number
}

export interface Input extends InputVar {
  value: InputValue
}

/**
 * Gather the set of input variables used in this version of the model.
 */
export function getInputVars(inputSpecs: InputSpec[]): Map<InputVarId, Input> {
  const inputs: Map<InputVarId, Input> = new Map()
  for (const inputSpec of inputSpecs) {
    const varId = inputSpec.varId
    const input: Input = {
      varId,
      varName: inputSpec.varName,
      defaultValue: inputSpec.defaultValue,
      minValue: inputSpec.minValue,
      maxValue: inputSpec.maxValue,
      value: createInputValue(varId, inputSpec.defaultValue)
    }
    inputs.set(varId, input)
  }
  return inputs
}

/**
 * Set the given `Input` instances according to the given scenario.
 */
export function setInputsForScenario(inputs: Map<InputVarId, Input>, scenario: Scenario): void {
  function setInputToValue(input: Input, value: number): void {
    if (value < input.minValue) {
      // TODO: Set an error status so that the scenario is flagged as an
      // error in the UI (for now, just warn and clamp)
      console.warn(
        `WARNING: Scenario input value ${value} is < min value (${input.minValue}) ` + `for input '${input.varName}'`
      )
      value = input.minValue
    } else if (value > input.maxValue) {
      console.warn(
        `WARNING: Scenario input value ${value} is > max value (${input.maxValue}) ` + `for input '${input.varName}'`
      )
      value = input.maxValue
    }
    input.value.set(value)
  }

  function setInputToDefault(input: Input): void {
    input.value.reset()
  }
  function setInputToMinimum(input: Input): void {
    input.value.set(input.minValue)
  }
  function setInputToMaximum(input: Input): void {
    input.value.set(input.minValue)
  }

  function setAllToDefault(): void {
    inputs.forEach(setInputToDefault)
  }
  function setAllToMinimum(): void {
    inputs.forEach(setInputToMinimum)
  }
  function setAllToMaximum(): void {
    inputs.forEach(setInputToMaximum)
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
