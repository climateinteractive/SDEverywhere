// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { InputPosition, ScenarioSpec } from '../../_shared/scenario-spec-types'
import { allInputsAtPositionSpec, inputAtPositionSpec, inputAtValueSpec } from '../../_shared/scenario-specs'
import type { VarId } from '../../_shared/types'
import type { InputVar } from '../../bundle/var-types'
import type { CheckScenario, CheckScenarioInputDesc } from '../check-scenario'

export function inputVar(varName: string): [VarId, InputVar] {
  const varId = `_${varName.toLowerCase()}`
  const v: InputVar = {
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
