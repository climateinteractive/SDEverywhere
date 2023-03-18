// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputSetting, Scenario } from '../../_shared/scenario'
import {
  allInputsAtPositionScenario,
  keyForInputAtPosition,
  keyForInputAtValue,
  positionSetting,
  settingsScenario,
  valueSetting
} from '../../_shared/scenario'
import type { ScenarioGroupKey, ScenarioKey } from '../../_shared/types'

import type { CompareScenario, CompareScenarioInput } from '../_shared/compare-resolved-types'

/**
 * Create a `Scenario` instance that can be used to run the model given a
 * `CompareScenario` object.
 */
export function scenariosFromDef(scenarioDef: CompareScenario): [Scenario | undefined, Scenario | undefined] {
  switch (scenarioDef.kind) {
    case 'scenario-with-all-inputs': {
      // In this case, the same `Scenario` can be used on both sides
      const scenario = allInputsAtPositionScenario(scenarioDef.position)
      return [scenario, scenario]
    }
    case 'scenario-with-inputs': {
      // In this case, create separate `Scenario` instances for each side, in case the
      // input variable names are different
      const scenarioL = scenarioFromInputs(scenarioDef.resolvedInputs, 'left')
      const scenarioR = scenarioFromInputs(scenarioDef.resolvedInputs, 'right')
      return [scenarioL, scenarioR]
    }
    default:
      assertNever(scenarioDef)
  }
}

function scenarioFromInputs(inputs: CompareScenarioInput[], side: 'left' | 'right'): Scenario | undefined {
  const settings: InputSetting[] = []
  const keyParts: string[] = []

  // Create an `InputSetting` for each input
  for (const input of inputs) {
    const state = side === 'left' ? input.stateL : input.stateR

    // If any inputs on this side could not be resolved, return undefined so that we don't try
    // to fetch data for this side
    if (state.inputVar === undefined) {
      return undefined
    }

    // Create a scenario setting for this input
    const varId = state.inputVar.varId
    if (state.position) {
      settings.push(positionSetting(varId, state.position))
      keyParts.push(keyForInputAtPosition(varId, state.position))
    } else {
      settings.push(valueSetting(varId, state.value))
      keyParts.push(keyForInputAtValue(varId, state.value))
    }
  }

  // TODO: The following key derivation code is copied from `check/check-scenario.ts`; we should
  // share the code and use consistent keys between the two

  let scenarioKey: ScenarioKey
  // TODO: Eliminate groupKey
  let groupKey: ScenarioGroupKey
  if (settings.length === 1) {
    // Use a simple key when there's only one input
    scenarioKey = `input${keyParts[0]}`
    groupKey = settings[0].inputVarId
  } else if (settings.length > 1) {
    // Derive or build a key when there are multiple inputs
    // TODO: In `check-scenario.ts` we use the input group name, if available
    // if (groupName) {
    //   // Build a scenario/group key using the provided group name
    //   // TODO: Allow for specifying the groupKey in YAML?
    //   scenarioKey = `group_${groupName.toLowerCase().replace(/ /g, '_')}`
    //   groupKey = scenarioKey
    // } else {
    // No group name was provided, so build a scenario key by joining
    // all the key parts together
    // TODO: This could create very long and unwieldy keys if there are
    // many inputs; consider using a hash instead?
    scenarioKey = 'multi' + keyParts.join('_')
    groupKey = scenarioKey
  }

  return settingsScenario(scenarioKey, groupKey, settings)
}
