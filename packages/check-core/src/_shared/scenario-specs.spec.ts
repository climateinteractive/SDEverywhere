// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { allInputsAtPositionSpec, positionSetting, inputSettingsSpec, valueSetting } from './scenario-specs'

describe('allInputsAtPositionSpec', () => {
  it('should work with different positions', () => {
    expect(allInputsAtPositionSpec('at-default')).toEqual({
      kind: 'all-inputs',
      uid: 'all_inputs_at_default',
      position: 'at-default'
    })
    expect(allInputsAtPositionSpec('at-minimum')).toEqual({
      kind: 'all-inputs',
      uid: 'all_inputs_at_min',
      position: 'at-minimum'
    })
    expect(allInputsAtPositionSpec('at-maximum')).toEqual({
      kind: 'all-inputs',
      uid: 'all_inputs_at_max',
      position: 'at-maximum'
    })
  })
})

describe('inputSettingsSpec', () => {
  it('should create a spec with multiple input settings', () => {
    const scenario = inputSettingsSpec([positionSetting('_i1', 'at-minimum'), valueSetting('_i2', 50.5)])
    expect(scenario).toEqual({
      kind: 'input-settings',
      uid: 'inputs__i1_at_min__i2_at_50.5',
      settings: [
        {
          kind: 'position',
          inputVarId: '_i1',
          position: 'at-minimum'
        },
        {
          kind: 'value',
          inputVarId: '_i2',
          value: 50.5
        }
      ]
    })
  })

  it('should create specs with the same uid if the specs have same input settings but in different order', () => {
    const s1 = inputSettingsSpec([positionSetting('_i1', 'at-minimum'), valueSetting('_i2', 50.5)])
    const s2 = inputSettingsSpec([valueSetting('_i2', 50.5), positionSetting('_i1', 'at-minimum')])
    expect(s1.uid).toBe('inputs__i1_at_min__i2_at_50.5')
    expect(s2.uid).toBe('inputs__i1_at_min__i2_at_50.5')
  })
})
