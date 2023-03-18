// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { VarId } from './types'

/** A unique identifier for the scenario, derived from its input settings. */
export type ScenarioSpecUid = string

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

export interface InputSettingsSpec {
  kind: 'input-settings'
  uid: ScenarioSpecUid
  settings: InputSetting[]
}

export interface AllInputsSpec {
  kind: 'all-inputs'
  uid: ScenarioSpecUid
  position: InputPosition
}

export type ScenarioSpec = InputSettingsSpec | AllInputsSpec
