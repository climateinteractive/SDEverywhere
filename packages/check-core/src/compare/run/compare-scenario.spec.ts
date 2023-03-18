// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'
import {
  allInputsAtPositionScenario,
  inputAtPositionScenario,
  inputAtValueScenario,
  positionSetting,
  settingsScenario,
  valueSetting
} from '../../_shared/scenario'
import {
  allAtPos,
  inputVar,
  resolvedInput,
  scenarioWithInput,
  scenarioWithInputs
} from '../_shared/_mocks/mock-resolved-types'
import { scenariosFromDef } from './compare-scenario'

describe('scenariosFromDef', () => {
  it('should create valid Scenario instances for "all inputs at position" scenario', () => {
    const [scenarioL, scenarioR] = scenariosFromDef(allAtPos('at-maximum'))
    expect(scenarioL).toEqual(allInputsAtPositionScenario('at-maximum'))
    expect(scenarioR).toEqual(allInputsAtPositionScenario('at-maximum'))
  })

  it('should create valid Scenario instances for a "single input at position" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [scenarioL, scenarioR] = scenariosFromDef(scenarioWithInput('i1', 'at-minimum', i1L, i1R))
    expect(scenarioL).toEqual(inputAtPositionScenario('_i1_orig', '_i1_orig', 'at-minimum'))
    expect(scenarioR).toEqual(inputAtPositionScenario('_i1_renamed', '_i1_renamed', 'at-minimum'))
  })

  it('should create valid Scenario instances for a "single input at value" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const [scenarioL, scenarioR] = scenariosFromDef(scenarioWithInput('i1', 10, i1L, i1R))
    expect(scenarioL).toEqual(inputAtValueScenario('_i1_orig', '_i1_orig', 10))
    expect(scenarioR).toEqual(inputAtValueScenario('_i1_renamed', '_i1_renamed', 10))
  })

  it('should create valid Scenario instances for a "multiple inputs" scenario', () => {
    const i1L = inputVar('i1_orig', '1')[1]
    const i1R = inputVar('i1_renamed', '1')[1]
    const i2 = inputVar('i2', '2')[1]
    const scenarioDef = scenarioWithInputs([
      resolvedInput('i1', 10, i1L, i1R),
      resolvedInput('i2', 'at-maximum', i2, i2)
    ])

    const [scenarioL, scenarioR] = scenariosFromDef(scenarioDef)
    expect(scenarioL).toEqual(
      settingsScenario('multi_i1_orig_at_10__i2_at_max', 'multi_i1_orig_at_10__i2_at_max', [
        valueSetting('_i1_orig', 10),
        positionSetting('_i2', 'at-maximum')
      ])
    )
    expect(scenarioR).toEqual(
      settingsScenario('multi_i1_renamed_at_10__i2_at_max', 'multi_i1_renamed_at_10__i2_at_max', [
        valueSetting('_i1_renamed', 10),
        positionSetting('_i2', 'at-maximum')
      ])
    )
  })
})
