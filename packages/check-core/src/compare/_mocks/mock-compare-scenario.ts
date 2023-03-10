// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { InputPosition } from '../../_shared/scenario'
import type { VarId } from '../../_shared/types'
import type { InputId, InputVar } from '../../bundle/var-types'
import type {
  CompareScenarioError,
  CompareScenarioInput,
  CompareScenarioInputState,
  CompareScenarioWithAllInputs,
  CompareScenarioWithInputs
} from '../compare-scenario'

export function inputVar(varName: string, inputId?: InputId, maxValue = 100): [VarId, InputVar] {
  const varId = `_${varName.toLowerCase()}`
  const v: InputVar = {
    inputId,
    varId,
    varName,
    defaultValue: 50,
    minValue: 0,
    maxValue
  }
  return [varId, v]
}

export function nameForPos(position: InputPosition): string {
  switch (position) {
    case 'at-default':
      return 'default'
    case 'at-minimum':
      return 'minimum'
    case 'at-maximum':
      return 'maximum'
    default:
      return ''
  }
}

export function valueForPos(inputVar: InputVar, position: InputPosition): number | undefined {
  switch (position) {
    case 'at-default':
      return inputVar.defaultValue
    case 'at-minimum':
      return inputVar.minValue
    case 'at-maximum':
      return inputVar.maxValue
    default:
      return undefined
  }
}

export function allAtPos(position: InputPosition): CompareScenarioWithAllInputs {
  return {
    kind: 'with-all-inputs',
    position
  }
}

export function scenarioWithInput(
  requestedName: string,
  at: InputPosition | number,
  inputVarL: InputVar | CompareScenarioError | undefined,
  inputVarR: InputVar | CompareScenarioError | undefined
): CompareScenarioWithInputs {
  const resolvedInput: CompareScenarioInput = {
    requestedName,
    stateL: stateForInputVar(inputVarL, at),
    stateR: stateForInputVar(inputVarR, at)
  }
  return {
    kind: 'with-inputs',
    resolvedInputs: [resolvedInput]
  }
}

export function stateForInputVar(
  inputVar: InputVar | CompareScenarioError | undefined,
  at: InputPosition | number
): CompareScenarioInputState {
  if (inputVar === undefined) {
    return {
      error: {
        kind: 'unknown-input'
      }
    }
  }

  if ('kind' in inputVar) {
    return {
      error: inputVar
    }
  }

  let position: InputPosition
  let value: number
  if (typeof at === 'string') {
    position = at as InputPosition
    value = valueForPos(inputVar, position)
  } else {
    value = at as number
  }

  return {
    inputVar,
    position,
    value
  }
}
