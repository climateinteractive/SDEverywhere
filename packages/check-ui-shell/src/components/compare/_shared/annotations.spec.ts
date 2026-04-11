// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type {
  ComparisonDataset,
  ComparisonResolverError,
  ComparisonScenario,
  DatasetKey,
  OutputVar
} from '@sdeverywhere/check-core'

import { varIdForName } from '../../../_mocks/mock-vars'

import { getAnnotationsForDataset, getAnnotationsForScenario } from './annotations'
import {
  inputAtPositionSpec,
  inputSettingsSpec,
  inputVar,
  positionSetting,
  resolvedInput,
  scenarioWithInput,
  scenarioWithInputs
} from '../../../_mocks/mock-comparison-scenario'

const bundleNameL = 'baseline'
const bundleNameR = 'current'

const errUnknownInput: ComparisonResolverError = { kind: 'unknown-input' }
const errUnknownSettingGroup: ComparisonResolverError = { kind: 'unknown-input-setting-group' }

function outputVar(varName: string, source?: string): OutputVar {
  const varId = varIdForName(varName)
  const datasetKey = `${source || 'Model'}${varId}`
  const v: OutputVar = {
    datasetKey,
    sourceName: source,
    varId,
    varName
  }
  return v
}

function dataset(key: DatasetKey, outputVarL?: OutputVar, outputVarR?: OutputVar): ComparisonDataset {
  return {
    kind: 'dataset',
    key,
    outputVarL,
    outputVarR
  }
}

describe('getAnnotationsForDataset', () => {
  it('should return no annotations for valid dataset', () => {
    const v = outputVar('A')
    const d = dataset(v.datasetKey, v, v)
    const annotations = getAnnotationsForDataset(d, bundleNameL, bundleNameR)
    expect(annotations).toEqual([])
  })

  it('should return correct annotation when variable is only defined on left side', () => {
    const v = outputVar('A')
    const d = dataset(v.datasetKey, v, undefined)
    const annotations = getAnnotationsForDataset(d, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;variable only defined in <span class="dataset-color-0">baseline</span></span>`
    ])
  })

  it('should return correct annotation when variable is only defined on right side', () => {
    const v = outputVar('A')
    const d = dataset(v.datasetKey, undefined, v)
    const annotations = getAnnotationsForDataset(d, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;variable only defined in <span class="dataset-color-1">current</span></span>`
    ])
  })

  it('should return correct annotation when has been renamed', () => {
    const vL = outputVar('Aold')
    const vR = outputVar('Anew')
    const d = dataset(vL.datasetKey, vL, vR)
    const annotations = getAnnotationsForDataset(d, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;variable renamed, previously 'Aold'</span>`
    ])
  })
})

describe('getAnnotationsForScenario', () => {
  it('should return no annotations for valid scenario', () => {
    const i1 = inputVar('1', 'Input1')[1]
    const spec = inputAtPositionSpec('uid1', '_input1', 'at-maximum')
    const s = scenarioWithInput('s1', 'i1', 'at-maximum', i1, i1, spec, spec)
    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([])
  })

  it('should return correct annotation when scenario is invalid on both sides', () => {
    const s = scenarioWithInput('s1', 'i1', 'at-maximum', errUnknownInput, errUnknownInput, undefined, undefined)
    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-failed">✗</span>&ensp;invalid scenario: unknown input 'i1'</span>`
    ])
  })

  it('should return correct annotation when scenario is only valid on left side (one unknown input on right)', () => {
    const i1 = inputVar('1', 'Input1')[1]
    const spec = inputAtPositionSpec('uid1', '_input1', 'at-maximum')
    const s = scenarioWithInput('s1', 'i1', 'at-maximum', i1, errUnknownInput, spec, undefined)
    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;scenario not valid in <span class="dataset-color-1">current</span>: unknown input 'i1'</span>`
    ])
  })

  it('should return correct annotation when scenario is only valid on right side (multiple unknown inputs on left)', () => {
    const i1 = inputVar('1', 'Input1')[1]
    const i2 = inputVar('2', 'Input2')[1]
    const resolvedInputs = [
      resolvedInput('i1', 'at-maximum', errUnknownInput, i1),
      resolvedInput('i2', 'at-maximum', errUnknownInput, i2)
    ]
    const spec = inputSettingsSpec('uid1', [positionSetting('_i1', 'at-maximum'), positionSetting('_i2', 'at-maximum')])
    const s = scenarioWithInputs('s1', resolvedInputs, undefined, spec)
    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;scenario not valid in <span class="dataset-color-0">baseline</span>: unknown inputs 'i1', 'i2'</span>`
    ])
  })

  it('should return correct annotation when setting group is invalid on both sides', () => {
    const s: ComparisonScenario = {
      kind: 'scenario',
      key: 's1',
      id: 'sg1',
      title: 'sg1',
      settings: {
        kind: 'input-settings',
        inputs: [
          {
            requestedName: 'sg1',
            stateL: { error: errUnknownSettingGroup },
            stateR: { error: errUnknownSettingGroup }
          }
        ]
      },
      specL: undefined,
      specR: undefined
    }

    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-failed">✗</span>&ensp;invalid scenario: unknown input setting group 'sg1'</span>`
    ])
  })

  it('should return correct annotation when setting group is only valid on left side (group is unknown on right)', () => {
    const s: ComparisonScenario = {
      kind: 'scenario',
      key: 's1',
      id: 'sg1',
      title: 'sg1',
      settings: {
        kind: 'input-settings',
        inputs: [
          {
            requestedName: 'sg1',
            stateL: {},
            stateR: { error: errUnknownSettingGroup }
          }
        ]
      },
      specL: undefined,
      specR: undefined
    }

    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;scenario not valid in <span class="dataset-color-1">current</span>: unknown input setting group 'sg1'</span>`
    ])
  })

  it('should return correct annotation when setting group is only valid on right side (group is unknown on left, plus invalid input on right)', () => {
    const s: ComparisonScenario = {
      kind: 'scenario',
      key: 's1',
      id: 'sg1',
      title: 'sg1',
      settings: {
        kind: 'input-settings',
        inputs: [
          {
            requestedName: 'sg1',
            stateL: { error: errUnknownSettingGroup },
            stateR: {}
          },
          {
            requestedName: 'i1',
            stateL: {},
            stateR: { error: errUnknownInput }
          }
        ]
      },
      specL: undefined,
      specR: undefined
    }

    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;scenario not valid in <span class="dataset-color-0">baseline</span>: unknown input setting group 'sg1'</span>`,
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;scenario not valid in <span class="dataset-color-1">current</span>: unknown input 'i1'</span>`
    ])
  })

  it('should return correct annotation when settings differ between the two models', () => {
    const s: ComparisonScenario = {
      kind: 'scenario',
      key: 's1',
      id: 'sg1',
      title: 'sg1',
      settings: {
        kind: 'input-settings',
        inputs: [],
        settingsDiffer: true
      },
      specL: undefined,
      specR: undefined
    }

    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      '<span class="annotation"><span class="status-color-warning">‼</span>&ensp;input settings differ between the two models</span>'
    ])
  })

  it.skip('should return correct annotations when min/max value has changed for multiple inputs', () => {
    const i1L = inputVar('1', 'Input1', 0)[1]
    const i1R = inputVar('1', 'Input1', 10)[1]
    const i2L = inputVar('2', 'Input2', 0, 100)[1]
    const i2R = inputVar('2', 'Input2', 0, 90)[1]
    const resolvedInputs = [resolvedInput('i1', 'at-minimum', i1L, i1R), resolvedInput('i2', 'at-maximum', i2L, i2R)]
    const spec = inputSettingsSpec('uid1', [positionSetting('_i1', 'at-minimum'), positionSetting('_i2', 'at-maximum')])
    const s = scenarioWithInputs('s1', resolvedInputs, spec, spec)
    const annotations = getAnnotationsForScenario(s, bundleNameL, bundleNameR)
    expect(annotations).toEqual([
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;min value changed for 'i1' (<span class="dataset-color-0">0</span> | <span class="dataset-color-1">10</span></span>`,
      `<span class="annotation"><span class="status-color-warning">‼</span>&ensp;max value changed for 'i2' (<span class="dataset-color-0">100</span> | <span class="dataset-color-1">90</span></span>`
    ])

    // - ! {min/max} value changed for input {var} ({left val} | {right val})
  })

  // it('should return correct annotation when max value has changed for an input', () => {})

  // it('should return correct annotation when an input has been renamed', () => {
  //   // - ! input variable renamed: {left var} -> {right var}
  // })

  // it('should return correct annotation when a value is out of range on left side', () => {
  //   // - x value out of range for input {var} in {bundle}
  // })

  // it('should return correct annotation when a value is out of range on right side', () => {})

  // it('should return correct annotation when a value is out of range on both sides', () => {
  //   // - x value out of range for input {var}
  // })
})
