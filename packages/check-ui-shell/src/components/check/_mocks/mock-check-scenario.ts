// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  VarId,
  InputVar,
  InputPosition,
  CheckScenario,
  CheckScenarioInputDesc,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import {
  allInputsAtPositionSpec,
  inputAtPositionSpec,
  inputSettingsSpec,
  valueSetting
} from '../../../_mocks/mock-scenario-spec'

export function inputVar(inputId: string, varName: string): [VarId, InputVar] {
  const varId = `_${varName.toLowerCase()}`
  const v: InputVar = {
    inputId,
    varId,
    varName,
    defaultValue: 50,
    minValue: 0,
    maxValue: 100
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

export function valueForPos(position: InputPosition): number | undefined {
  switch (position) {
    case 'at-default':
      return 50
    case 'at-minimum':
      return 0
    case 'at-maximum':
      return 100
    default:
      return undefined
  }
}

export function allAtPos(position: InputPosition): CheckScenario {
  return {
    spec: allInputsAtPositionSpec(position),
    inputDescs: []
  }
}

export function inputAtPos(inputVar: InputVar, position: InputPosition): CheckScenario {
  const varName = inputVar.varName
  const varId = `_${varName.toLowerCase()}`
  const spec = inputAtPositionSpec(varId, position)
  const inputDesc: CheckScenarioInputDesc = {
    name: varName,
    inputVar,
    position,
    value: valueForPos(position)
  }
  return {
    spec,
    inputDescs: [inputDesc]
  }
}

function inputAtValueSpec(inputVarId: VarId, value: number): ScenarioSpec {
  return inputSettingsSpec([valueSetting(inputVarId, value)])
}

export function inputAtValue(inputVar: InputVar, value: number): CheckScenario {
  const varName = inputVar.varName
  const varId = `_${varName.toLowerCase()}`
  const spec = inputAtValueSpec(varId, value)
  const inputDesc: CheckScenarioInputDesc = {
    name: varName,
    inputVar,
    value
  }
  return {
    spec,
    inputDescs: [inputDesc]
  }
}

export function inputDesc(inputVar: InputVar, at: InputPosition | number): CheckScenarioInputDesc {
  let position: InputPosition
  let value: number
  if (typeof at === 'string') {
    position = at as InputPosition
    switch (position) {
      case 'at-default':
        value = inputVar.defaultValue
        break
      case 'at-minimum':
        value = inputVar.minValue
        break
      case 'at-maximum':
        value = inputVar.maxValue
        break
      default:
        break
    }
  } else {
    value = at as number
  }
  return {
    name: inputVar.varName,
    inputVar,
    position,
    value
  }
}

export function multipleInputs(
  spec: ScenarioSpec,
  inputGroupName: string | undefined,
  inputDescs: CheckScenarioInputDesc[]
): CheckScenario {
  return {
    spec,
    inputGroupName,
    inputDescs
  }
}
