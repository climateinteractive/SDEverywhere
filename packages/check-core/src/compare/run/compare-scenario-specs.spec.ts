// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import {
  allInputsAtPositionSpec,
  inputAtPositionSpec,
  inputAtValueSpec,
  inputSettingsSpec,
  positionSetting,
  valueSetting
} from '../../_shared/scenario-specs'
import {
  allAtPos,
  inputVar,
  resolvedInput,
  scenarioWithInput,
  scenarioWithInputs
} from '../_shared/_mocks/mock-resolved-types'

import { scenarioSpecsFromDef } from './compare-scenario-specs'

describe('scenarioSpecsFromDef', () => {
  it('should create valid ScenarioSpec instances for "all inputs at position" scenario', () => {
    const [scenarioSpecL, scenarioSpecR] = scenarioSpecsFromDef(allAtPos('at-maximum'))
    expect(scenarioSpecL).toEqual(allInputsAtPositionSpec('at-maximum'))
    expect(scenarioSpecR).toEqual(allInputsAtPositionSpec('at-maximum'))
  })

  it('should create valid ScenarioSpec instances for a "single input at position" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [scenarioSpecL, scenarioSpecR] = scenarioSpecsFromDef(scenarioWithInput('i1', 'at-minimum', i1L, i1R))
    expect(scenarioSpecL).toEqual(inputAtPositionSpec('_i1_orig', 'at-minimum'))
    expect(scenarioSpecR).toEqual(inputAtPositionSpec('_i1_renamed', 'at-minimum'))
  })

  it('should create valid ScenarioSpec instances for a "single input at value" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [scenarioSpecL, scenarioSpecR] = scenarioSpecsFromDef(scenarioWithInput('i1', 10, i1L, i1R))
    expect(scenarioSpecL).toEqual(inputAtValueSpec('_i1_orig', 10))
    expect(scenarioSpecR).toEqual(inputAtValueSpec('_i1_renamed', 10))
  })

  it('should create valid ScenarioSpec instances for a "multiple inputs" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const i2 = inputVar('i2', '2')[1]
    const scenarioDef = scenarioWithInputs([
      resolvedInput('i1', 10, i1L, i1R),
      resolvedInput('i2', 'at-maximum', i2, i2)
    ])

    const [scenarioSpecL, scenarioSpecR] = scenarioSpecsFromDef(scenarioDef)
    expect(scenarioSpecL).toEqual(
      inputSettingsSpec([valueSetting('_i1_orig', 10), positionSetting('_i2', 'at-maximum')])
    )
    expect(scenarioSpecR).toEqual(
      inputSettingsSpec([valueSetting('_i1_renamed', 10), positionSetting('_i2', 'at-maximum')])
    )
  })
})
