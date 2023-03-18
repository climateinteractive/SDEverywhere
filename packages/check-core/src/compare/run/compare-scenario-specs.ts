// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputSetting, ScenarioSpec } from '../../_shared/scenario-spec-types'
import { allInputsAtPositionSpec, inputSettingsSpec, positionSetting, valueSetting } from '../../_shared/scenario-specs'

import type { CompareScenario, CompareScenarioInput } from '../_shared/compare-resolved-types'

/**
 * Create a pair of `ScenarioSpec` instances that can be used to run each model given a
 * `CompareScenario` object.
 */
export function scenarioSpecsFromDef(
  scenarioDef: CompareScenario
): [ScenarioSpec | undefined, ScenarioSpec | undefined] {
  switch (scenarioDef.kind) {
    case 'scenario-with-all-inputs': {
      // In this case, the same `Scenario` can be used on both sides
      const scenario = allInputsAtPositionSpec(scenarioDef.position)
      return [scenario, scenario]
    }
    case 'scenario-with-inputs': {
      // In this case, create separate `Scenario` instances for each side, in case the
      // input variable names are different
      const scenarioL = scenarioSpecFromInputs(scenarioDef.resolvedInputs, 'left')
      const scenarioR = scenarioSpecFromInputs(scenarioDef.resolvedInputs, 'right')
      return [scenarioL, scenarioR]
    }
    default:
      assertNever(scenarioDef)
  }
}

function scenarioSpecFromInputs(inputs: CompareScenarioInput[], side: 'left' | 'right'): ScenarioSpec | undefined {
  const settings: InputSetting[] = []

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
    } else {
      settings.push(valueSetting(varId, state.value))
    }
  }

  return inputSettingsSpec(settings)
}
