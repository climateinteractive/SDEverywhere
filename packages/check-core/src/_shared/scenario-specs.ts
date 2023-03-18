// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'
import type { InputPosition, InputSetting, ScenarioSpec } from './scenario-spec-types'
import type { VarId } from './types'

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

export function inputSettingsSpec(settings: InputSetting[]): ScenarioSpec {
  const uidParts = settings.map(setting => {
    switch (setting.kind) {
      case 'position':
        return `${setting.inputVarId}_at_${keyForInputPosition(setting.position)}`
      case 'value':
        return `${setting.inputVarId}_at_${setting.value}`
      default:
        assertNever(setting)
    }
  })
  // TODO: Ideally we would reduce the long UID to a short hash here when there are many settings
  const uid = `inputs_${uidParts.sort().join('_')}`

  return {
    kind: 'input-settings',
    uid,
    settings
  }
}

export function inputAtPositionSpec(inputVarId: VarId, position: InputPosition): ScenarioSpec {
  return inputSettingsSpec([positionSetting(inputVarId, position)])
}

export function inputAtValueSpec(inputVarId: VarId, value: number): ScenarioSpec {
  return inputSettingsSpec([valueSetting(inputVarId, value)])
}

export function allInputsAtPositionSpec(position: InputPosition): ScenarioSpec {
  return {
    kind: 'all-inputs',
    uid: `all_inputs_at_${keyForInputPosition(position)}`,
    position
  }
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
