// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { VarId } from './types'

/**
 * Specifies a constant override that will be applied when running the model.
 *
 * Unlike `InputSetting` (which works with pre-declared input variables that have
 * defined min/max ranges), constant overrides can modify ANY constant in the model
 * when the `customConstants` feature is enabled.
 */
export interface ConstantOverride {
  /** The variable ID of the constant to be overridden. */
  varId: VarId
  /** The new value for the constant. */
  value: number
}

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
