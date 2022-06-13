// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'
import type { ScenarioGroupKey, ScenarioKey, VarId } from './types'

export type InputPosition = 'at-default' | 'at-minimum' | 'at-maximum'

export interface PositionSetting {
  kind: 'position'
  inputVarId: VarId
  position: InputPosition
}

export interface ValueSetting {
  kind: 'value'
  inputVarId: VarId
  value: number
}

export type InputSetting = PositionSetting | ValueSetting

export interface SettingsScenario {
  kind: 'settings'
  key: ScenarioKey
  groupKey: ScenarioGroupKey
  settings: InputSetting[]
}

export interface AllInputsScenario {
  kind: 'all-inputs'
  key: ScenarioKey
  groupKey: ScenarioGroupKey
  position: InputPosition
}

export type Scenario = SettingsScenario | AllInputsScenario

export function positionSetting(inputVarId: VarId, position: InputPosition): InputSetting {
  return {
    kind: 'position',
    inputVarId,
    position
  }
}

export function valueSetting(inputVarId: VarId, value: number): InputSetting {
  return {
    kind: 'value',
    inputVarId,
    value
  }
}

export function settingsScenario(key: ScenarioKey, groupKey: ScenarioGroupKey, settings: InputSetting[]): Scenario {
  return {
    kind: 'settings',
    key,
    groupKey,
    settings
  }
}

export function inputAtPositionScenario(
  inputVarId: VarId,
  groupKey: ScenarioGroupKey,
  position: InputPosition
): Scenario {
  const key = keyForInputAtPosition(`input${inputVarId}`, position)
  return settingsScenario(key, groupKey, [positionSetting(inputVarId, position)])
}

export function inputAtValueScenario(inputVarId: VarId, groupKey: ScenarioGroupKey, value: number): Scenario {
  const key = keyForInputAtValue(`input${inputVarId}`, value)
  return settingsScenario(key, groupKey, [valueSetting(inputVarId, value)])
}

export function allInputsAtPositionScenario(position: InputPosition): Scenario {
  return {
    kind: 'all-inputs',
    key: keyForInputAtPosition('all_inputs', position),
    groupKey: 'all_inputs',
    position
  }
}

/**
 * Return an array of scenarios that can be used to run the model
 * with a matrix of output/input scenarios.
 *
 * For each output variable, run the model:
 *   - once with all inputs at their default
 *   - once with all inputs at their minimum
 *   - once with all inputs at their maximum
 *   - twice for each input
 *       - once with single input at its minimum
 *       - once with single input at its maximum
 */
export function matrixScenarios(inputVarIds: VarId[]): Scenario[] {
  const scenarios: Scenario[] = []
  scenarios.push(allInputsAtPositionScenario('at-default'))
  scenarios.push(allInputsAtPositionScenario('at-minimum'))
  scenarios.push(allInputsAtPositionScenario('at-maximum'))
  for (const inputVarId of inputVarIds) {
    scenarios.push(inputAtPositionScenario(inputVarId, inputVarId, 'at-minimum'))
    scenarios.push(inputAtPositionScenario(inputVarId, inputVarId, 'at-maximum'))
  }
  return scenarios
}

function keyForInputPosition(position: InputPosition): string {
  switch (position) {
    case 'at-default':
      return 'default'
    case 'at-minimum':
      return 'min'
    case 'at-maximum':
      return 'max'
    default:
      assertNever(position)
  }
}

export function keyForInputAtPosition(inputKey: string, position: InputPosition): string {
  return `${inputKey}_at_${keyForInputPosition(position)}`
}

export function keyForInputAtValue(inputKey: string, value: number): string {
  return `${inputKey}_at_${value}`
}
