// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { VarId } from '../_shared/types'
import type { ModelSpec } from '../bundle/bundle-types'
import type { InputVar } from '../bundle/var-types'
import { expandScenarios } from './check-scenario'
import type { CheckScenarioSpec } from './check-spec'
import { allAtPos, inputAtPos, inputAtValue, inputDesc, inputVar, multipleInputs } from './_mocks/mock-check-scenario'
import { settingsScenario } from '..'
import { positionSetting, valueSetting } from '../_shared/scenario'

describe('expandScenarios', () => {
  const inputVars: Map<VarId, InputVar> = new Map([inputVar('I1'), inputVar('I2'), inputVar('I3')])

  const i1 = inputVars.get('_i1')
  const i2 = inputVars.get('_i2')
  const i3 = inputVars.get('_i3')

  const inputGroups: Map<string, InputVar[]> = new Map([
    ['input group 1', [i1, i2]],
    ['Input Group 2', [i2, i3]],
    ['input group 3', []]
  ])

  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars,
    outputVars: new Map(),
    implVars: new Map(),
    inputGroups
  }

  it('should expand "with: input" at position specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      { with: 'I1', at: 'default' },
      { with: 'I2', at: 'min' },
      { with: 'i3', at: 'max' }
    ]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      inputAtPos(i1, 'at-default'),
      inputAtPos(i2, 'at-minimum'),
      inputAtPos(i3, 'at-maximum')
    ])
  })

  it('should expand "with: input" at value specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      { with: 'I1', at: 20 },
      { with: 'I2', at: 40 },
      { with: 'i3', at: 60 }
    ]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      inputAtValue(i1, 20),
      inputAtValue(i2, 40),
      inputAtValue(i3, 60)
    ])
  })

  it('should expand "with: [...]" multiple setting specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      {
        with: [
          { input: 'I1', at: 20 },
          { input: 'I2', at: 40 },
          { input: 'i3', at: 'max' }
        ]
      }
    ]

    const key = 'multi_i1_at_20__i2_at_40__i3_at_max'
    const scenario = settingsScenario(key, key, [
      valueSetting('_i1', 20),
      valueSetting('_i2', 40),
      positionSetting('_i3', 'at-maximum')
    ])
    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      multipleInputs(scenario, undefined, [inputDesc(i1, 20), inputDesc(i2, 40), inputDesc(i3, 'at-maximum')])
    ])
  })

  it('should expand "with_inputs: all" at position specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      { with_inputs: 'all', at: 'default' },
      { with_inputs: 'all', at: 'min' },
      { with_inputs: 'all', at: 'max' }
    ]
    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      allAtPos('at-default'),
      allAtPos('at-minimum'),
      allAtPos('at-maximum')
    ])
  })

  it('should expand "with_inputs_in: group" at position specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      { with_inputs_in: 'Input GROUP 1', at: 'min' },
      { with_inputs_in: 'input group 2', at: 'max' },
      { with_inputs: 'all', at: 'max' }
    ]

    const key1 = 'group_input_group_1'
    const scenario1 = settingsScenario(key1, key1, [
      positionSetting('_i1', 'at-minimum'),
      positionSetting('_i2', 'at-minimum')
    ])

    const key2 = 'group_input_group_2'
    const scenario2 = settingsScenario(key2, key2, [
      positionSetting('_i2', 'at-maximum'),
      positionSetting('_i3', 'at-maximum')
    ])

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      multipleInputs(scenario1, 'input group 1', [inputDesc(i1, 'at-minimum'), inputDesc(i2, 'at-minimum')]),
      multipleInputs(scenario2, 'Input Group 2', [inputDesc(i2, 'at-maximum'), inputDesc(i3, 'at-maximum')]),
      allAtPos('at-maximum')
    ])
  })

  it('should expand "with_inputs_in: group" to error when group is unknown', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [{ with_inputs_in: 'Unknown Group', at: 'min' }]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      {
        inputDescs: [],
        error: {
          kind: 'unknown-input-group',
          name: 'Unknown Group'
        }
      }
    ])
  })

  it('should expand "with_inputs_in: group" to error when group is empty', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [{ with_inputs_in: 'input group 3', at: 'min' }]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      {
        inputDescs: [],
        error: {
          kind: 'empty-input-group',
          name: 'input group 3'
        }
      }
    ])
  })

  it('should expand "scenario_for_each_input_in: group" at position specs', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [
      { scenarios_for_each_input_in: 'Input GROUP 1', at: 'min' },
      { scenarios_for_each_input_in: 'input group 2', at: 'max' }
    ]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      inputAtPos(i1, 'at-minimum'),
      inputAtPos(i2, 'at-minimum'),
      inputAtPos(i2, 'at-maximum'),
      inputAtPos(i3, 'at-maximum')
    ])
  })

  it('should expand "scenario_for_each_input_in: group" with error when group is unknown', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [{ scenarios_for_each_input_in: 'Unknown Group', at: 'min' }]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      {
        inputDescs: [],
        error: {
          kind: 'unknown-input-group',
          name: 'Unknown Group'
        }
      }
    ])
  })

  it('should expand "scenario_for_each_input_in: group" with error when group is empty', () => {
    const scenarioSpecs: CheckScenarioSpec[] = [{ scenarios_for_each_input_in: 'input group 3', at: 'min' }]

    expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
      {
        inputDescs: [],
        error: {
          kind: 'empty-input-group',
          name: 'input group 3'
        }
      }
    ])
  })

  it('should expand "preset: matrix" spec', () => {
    expect(expandScenarios(modelSpec, [{ preset: 'matrix' }], false)).toMatchObject([
      allAtPos('at-default'),
      allAtPos('at-minimum'),
      allAtPos('at-maximum'),
      inputAtPos(i1, 'at-minimum'),
      inputAtPos(i1, 'at-maximum'),
      inputAtPos(i2, 'at-minimum'),
      inputAtPos(i2, 'at-maximum'),
      inputAtPos(i3, 'at-minimum'),
      inputAtPos(i3, 'at-maximum')
    ])
  })

  it('should expand "preset: matrix" spec into a smaller set when simplify is true', () => {
    expect(expandScenarios(modelSpec, [{ preset: 'matrix' }], true)).toEqual([allAtPos('at-default')])
  })
})
