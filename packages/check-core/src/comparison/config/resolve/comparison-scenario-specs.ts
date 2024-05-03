// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputSetting, ScenarioSpec } from '../../../_shared/scenario-spec-types'
import {
  allInputsAtPositionSpec,
  inputSettingsSpec,
  positionSetting,
  valueSetting
} from '../../../_shared/scenario-specs'

import type {
  ComparisonScenarioInput,
  ComparisonScenarioInputState,
  ComparisonScenarioSettings
} from '../../_shared/comparison-resolved-types'

/**
 * Create a pair of `ScenarioSpec` instances that can be used to run each model given a
 * `ComparisonScenarioSettings` object.
 */
export function scenarioSpecsFromSettings(
  settings: ComparisonScenarioSettings
): [ScenarioSpec | undefined, ScenarioSpec | undefined] {
  switch (settings.kind) {
    case 'all-inputs-settings': {
      // In this case, the same `Scenario` can be used on both sides
      const scenario = allInputsAtPositionSpec(settings.position)
      return [scenario, scenario]
    }
    case 'input-settings': {
      // In this case, create separate `Scenario` instances for each side, in case the
      // input variable names are different
      const specL = scenarioSpecFromInputs(settings.inputs, 'left')
      const specR = scenarioSpecFromInputs(settings.inputs, 'right')
      return [specL, specR]
    }
    default:
      assertNever(settings)
  }
}

/**
 * Create a `ScenarioSpec` instance that can be used to run a specific model for the
 * given input settings.
 */
function scenarioSpecFromInputs(inputs: ComparisonScenarioInput[], side: 'left' | 'right'): ScenarioSpec | undefined {
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
    settings.push(inputSettingFromResolvedInputState(state))
  }

  return inputSettingsSpec(settings)
}

/**
 * Create an `InputSetting` instance for the given resolved input that can be used to
 * build a `ScenarioSpec`.
 */
export function inputSettingFromResolvedInputState(state: ComparisonScenarioInputState): InputSetting {
  const varId = state.inputVar.varId
  if (state.position) {
    return positionSetting(varId, state.position)
  } else {
    return valueSetting(varId, state.value as number)
  }
}
