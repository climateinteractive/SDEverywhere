// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import {
  allInputsAtPositionSpec,
  inputAtPositionSpec,
  inputAtValueSpec,
  inputSettingsSpec,
  positionSetting,
  valueSetting
} from '../../../_shared/scenario-specs'
import { inputVar, resolvedInput } from '../../_shared/_mocks/mock-resolved-types'

import { scenarioSpecsFromSettings } from './compare-scenario-specs'

describe('scenarioSpecsFromSettings', () => {
  it('should create valid ScenarioSpec instances for "all inputs at position" scenario', () => {
    const [specL, specR] = scenarioSpecsFromSettings({
      kind: 'all-inputs-settings',
      position: 'at-maximum'
    })
    expect(specL).toEqual(allInputsAtPositionSpec('at-maximum'))
    expect(specR).toEqual(allInputsAtPositionSpec('at-maximum'))
  })

  it('should create valid ScenarioSpec instances for a "single input at position" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [specL, specR] = scenarioSpecsFromSettings({
      kind: 'input-settings',
      inputs: [resolvedInput('i1', 'at-minimum', i1L, i1R)]
    })
    expect(specL).toEqual(inputAtPositionSpec('_i1_orig', 'at-minimum'))
    expect(specR).toEqual(inputAtPositionSpec('_i1_renamed', 'at-minimum'))
  })

  it('should create valid ScenarioSpec instances for a "single input at value" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [specL, specR] = scenarioSpecsFromSettings({
      kind: 'input-settings',
      inputs: [resolvedInput('i1', 10, i1L, i1R)]
    })
    expect(specL).toEqual(inputAtValueSpec('_i1_orig', 10))
    expect(specR).toEqual(inputAtValueSpec('_i1_renamed', 10))
  })

  it('should create valid ScenarioSpec instances for a "multiple inputs" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const i2 = inputVar('i2', '2')[1]
    const [specL, specR] = scenarioSpecsFromSettings({
      kind: 'input-settings',
      inputs: [resolvedInput('i1', 10, i1L, i1R), resolvedInput('i2', 'at-maximum', i2, i2)]
    })
    expect(specL).toEqual(inputSettingsSpec([valueSetting('_i1_orig', 10), positionSetting('_i2', 'at-maximum')]))
    expect(specR).toEqual(inputSettingsSpec([valueSetting('_i1_renamed', 10), positionSetting('_i2', 'at-maximum')]))
  })
})
