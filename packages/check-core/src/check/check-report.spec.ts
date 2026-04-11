// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { positionSetting, inputSettingsSpec, valueSetting } from '../_shared/scenario-specs'
import type { CheckDataRef } from './check-data-ref'
import { dataRef } from './check-data-ref'
import type { CheckResult } from './check-func'
import type { CheckKey, CheckPlan, CheckPlanPredicate } from './check-planner'
import type { CheckPredicateOp } from './check-predicate'
import type { CheckPredicateOpRef, CheckScenarioReport } from './check-report'
import { buildCheckReport, datasetMessage, predicateMessage, scenarioMessage } from './check-report'
import { dataset } from './_mocks/mock-check-dataset'
import {
  datasetPlan,
  groupPlan,
  predPlan,
  scenarioPlan,
  testPlan,
  unknownDatasetPlan,
  unknownInputsScenarioPlan
} from './_mocks/mock-check-plan'
import {
  datasetReport,
  errorDatasetReport,
  errorPredicateReport,
  errorScenarioReport,
  groupReport,
  opConstantRef,
  opDataRef,
  predicateReport,
  scenarioReport,
  testReport
} from './_mocks/mock-check-report'
import { allAtPos, inputAtPos, inputAtValue, inputDesc, inputVar, multipleInputs } from './_mocks/mock-check-scenario'

const inputVars = new Map([inputVar('1', 'I1'), inputVar('2', 'I2')])
const i1 = inputVars.get('_i1')
const i2 = inputVars.get('_i2')

type PredPlansFunc = (...keys: number[]) => CheckPlanPredicate[]

const predPlans: PredPlansFunc = (...keys) => keys.map(k => predPlan(k, { eq: 0 }))

const bold = (s: string) => `_${s}_`

const eqZero: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(0)]]

describe('buildCheckReport', () => {
  it('should build a report that includes the correct statuses for passed and failed tests', () => {
    const dataRefs1: Map<CheckPredicateOp, CheckDataRef> = new Map([
      ['lt', dataRef(dataset('ModelImpl', 'V3'))],
      ['gt', dataRef(dataset('ModelImpl', 'V4[A1]'), inputAtPos(i1, 'at-minimum'))]
    ])
    const predPlansWithRef1: PredPlansFunc = k0 => [
      predPlan(
        k0,
        {
          lt: {
            dataset: { name: 'V3' }
          },
          gt: {
            dataset: { name: 'V4[A1]' },
            scenario: { input: 'I1', at: 'min' }
          }
        },
        dataRefs1
      )
    ]

    const dataRefs2: Map<CheckPredicateOp, CheckDataRef> = new Map([
      ['lt', dataRef(dataset('ModelImpl', 'V3'), inputAtPos(i1, 'at-minimum'))]
    ])
    const predPlansWithRef2: PredPlansFunc = k0 => [
      predPlan(
        k0,
        {
          lt: {
            dataset: { name: 'V3' },
            scenario: 'inherit'
          }
        },
        dataRefs2
      )
    ]

    const checkPlan: CheckPlan = {
      groups: [
        groupPlan('group1', [
          testPlan('test1', [scenarioPlan(allAtPos('at-default'), [datasetPlan('Model', 'V1', predPlans(1, 2))])]),
          testPlan('test2', [
            scenarioPlan(allAtPos('at-default'), [
              datasetPlan('ModelImpl', 'V4[A1]', predPlans(3)),
              datasetPlan('ModelImpl', 'V4[A2]', predPlans(4))
            ]),
            scenarioPlan(inputAtPos(i1, 'at-minimum'), [
              datasetPlan('ModelImpl', 'V4[A1]', predPlans(5, 6)),
              datasetPlan('ModelImpl', 'V4[A2]', predPlans(7, 8))
            ])
          ]),
          testPlan('test3', [scenarioPlan(inputAtValue(i1, 75), [datasetPlan('ModelImpl', 'V3', predPlans(9))])]),
          testPlan('test4', [
            scenarioPlan(allAtPos('at-default'), [datasetPlan('Model', 'V1', predPlansWithRef1(10))])
          ]),
          testPlan('test5', [
            scenarioPlan(inputAtPos(i1, 'at-minimum'), [datasetPlan('Model', 'V1', predPlansWithRef2(11))])
          ])
        ])
      ],
      tasks: new Map(),
      dataRefs: new Map()
    }

    const passedResult: CheckResult = {
      status: 'passed'
    }
    const failedResult: CheckResult = {
      status: 'failed',
      failValue: 666,
      failTime: 2000
    }

    const checkResults: Map<CheckKey, CheckResult> = new Map([
      [1, passedResult],
      [2, passedResult],
      [3, failedResult],
      [4, passedResult],
      [5, passedResult],
      [6, failedResult],
      [7, passedResult],
      [8, passedResult],
      [9, passedResult],
      [10, passedResult],
      [11, passedResult]
    ])

    const passedPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], passedResult)
    const failedPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], failedResult)

    const report = buildCheckReport(checkPlan, checkResults)
    expect(report.groups.length).toBe(1)
    expect(report.groups[0]).toEqual(
      groupReport('group1', [
        testReport('test1', 'passed', [
          scenarioReport(allAtPos('at-default'), 'passed', [
            datasetReport('Model', 'V1', 'passed', [passedPred(1), passedPred(2)])
          ])
        ]),
        testReport('test2', 'failed', [
          scenarioReport(allAtPos('at-default'), 'failed', [
            datasetReport('ModelImpl', 'V4[A1]', 'failed', [failedPred(3)]),
            datasetReport('ModelImpl', 'V4[A2]', 'passed', [passedPred(4)])
          ]),
          scenarioReport(inputAtPos(i1, 'at-minimum'), 'failed', [
            datasetReport('ModelImpl', 'V4[A1]', 'failed', [passedPred(5), failedPred(6)]),
            datasetReport('ModelImpl', 'V4[A2]', 'passed', [passedPred(7), passedPred(8)])
          ])
        ]),
        testReport('test3', 'passed', [
          scenarioReport(inputAtValue(i1, 75), 'passed', [datasetReport('ModelImpl', 'V3', 'passed', [passedPred(9)])])
        ]),
        testReport('test4', 'passed', [
          scenarioReport(allAtPos('at-default'), 'passed', [
            datasetReport('Model', 'V1', 'passed', [
              predicateReport(
                10,
                [
                  ['gt', opDataRef(dataset('ModelImpl', 'V4[A1]'), inputAtPos(i1, 'at-minimum'))],
                  ['lt', opDataRef(dataset('ModelImpl', 'V3'))]
                ],
                [`> 'V4[A1]' (w/ configured scenario)`, `< 'V3' (w/ default scenario)`],
                passedResult
              )
            ])
          ])
        ]),
        testReport('test5', 'passed', [
          scenarioReport(inputAtPos(i1, 'at-minimum'), 'passed', [
            datasetReport('Model', 'V1', 'passed', [
              predicateReport(
                11,
                [['lt', opDataRef(dataset('ModelImpl', 'V3'), inputAtPos(i1, 'at-minimum'))]],
                [`< 'V3' (w/ same scenario)`],
                passedResult
              )
            ])
          ])
        ])
      ])
    )
  })

  it('should build a report that includes the correct statuses for error cases', () => {
    const dataRefs: Map<CheckPredicateOp, CheckDataRef> = new Map()
    const predPlanWithUnknownDataset: PredPlansFunc = k0 => [
      predPlan(
        k0,
        {
          lt: {
            dataset: { name: 'UnknownOutput1' }
          }
        },
        dataRefs
      )
    ]
    const predPlanWithUnknownInput: PredPlansFunc = k0 => [
      predPlan(
        k0,
        {
          gt: {
            dataset: { name: 'Output X' },
            scenario: { input: 'UnknownInput1', at: 'min' }
          }
        },
        dataRefs
      )
    ]
    const predPlanWithUnknownInputGroup: PredPlansFunc = k0 => [
      predPlan(
        k0,
        {
          gt: {
            dataset: { name: 'Output X' },
            scenario: { input: 'UnknownInput1', at: 'min' }
          }
        },
        dataRefs
      )
    ]

    const checkPlan: CheckPlan = {
      groups: [
        groupPlan('group1', [
          testPlan('test1', [unknownInputsScenarioPlan('UnknownInput1')]),
          testPlan('test2', [scenarioPlan(inputAtPos(i1, 'at-maximum'), [unknownDatasetPlan('UnknownOutput1')])]),
          testPlan('test3', [
            scenarioPlan(allAtPos('at-default'), [
              datasetPlan('Model', 'V1', [
                predPlanWithUnknownDataset(1)[0],
                predPlanWithUnknownInput(2)[0],
                predPlanWithUnknownInputGroup(3)[0]
              ])
            ])
          ])
        ])
      ],
      tasks: new Map(),
      dataRefs
    }

    const result1: CheckResult = {
      status: 'error',
      errorInfo: {
        kind: 'unknown-dataset',
        name: 'UnknownOutput1'
      }
    }
    const result2: CheckResult = {
      status: 'error',
      errorInfo: {
        kind: 'unknown-input',
        name: 'UnknownInput1'
      }
    }
    const result3: CheckResult = {
      status: 'error',
      errorInfo: {
        kind: 'unknown-input-group',
        name: 'UnknownInputGroup1'
      }
    }

    const checkResults: Map<CheckKey, CheckResult> = new Map([
      [1, result1],
      [2, result2],
      [3, result3]
    ])

    const report = buildCheckReport(checkPlan, checkResults)
    expect(report.groups.length).toBe(1)
    expect(report.groups[0]).toEqual(
      groupReport('group1', [
        testReport('test1', 'error', [errorScenarioReport('UnknownInput1')]),
        testReport('test2', 'error', [
          scenarioReport(inputAtPos(i1, 'at-maximum'), 'error', [errorDatasetReport('UnknownOutput1')])
        ]),
        testReport('test3', 'error', [
          scenarioReport(allAtPos('at-default'), 'error', [
            datasetReport('Model', 'V1', 'error', [
              errorPredicateReport(1, result1),
              errorPredicateReport(2, result2),
              errorPredicateReport(3, result3)
            ])
          ])
        ])
      ])
    )
  })
})

describe('scenarioMessage', () => {
  it('should handle error case with one unknown input', () => {
    const s = errorScenarioReport('Unknown Input')
    expect(scenarioMessage(s, bold)).toBe('error: unknown input _Unknown Input_')
  })

  it('should handle error case with multiple unknown inputs', () => {
    const s = errorScenarioReport('Unknown Input A', 'Unknown Input B')
    expect(scenarioMessage(s, bold)).toBe('error: unknown inputs _Unknown Input A_, _Unknown Input B_')
  })

  it('should work with all inputs at default', () => {
    const s = scenarioReport(allAtPos('at-default'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _all inputs_ are at _default_...')
  })

  it('should work with all inputs at min', () => {
    const s = scenarioReport(allAtPos('at-minimum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _all inputs_ are at _minimum_...')
  })

  it('should work with all inputs at max', () => {
    const s = scenarioReport(allAtPos('at-maximum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _all inputs_ are at _maximum_...')
  })

  it('should work with single input at default', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-default'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _default_ (50)...')
  })

  it('should work with single input at min', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-minimum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _minimum_ (0)...')
  })

  it('should work with single input at max', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-maximum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _maximum_ (100)...')
  })

  it('should work with single input at specific value', () => {
    const s = scenarioReport(inputAtValue(i1, 66), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is _66_...')
  })

  it('should work with single input at default', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-default'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _default_ (50)...')
  })

  it('should work with single input at min', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-minimum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _minimum_ (0)...')
  })

  it('should work with single input at max', () => {
    const s = scenarioReport(inputAtPos(i1, 'at-maximum'), 'passed', [])
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is at _maximum_ (100)...')
  })

  it('should work with multiple input settings', () => {
    const scenarioSpec = inputSettingsSpec([valueSetting('_i1', 66), positionSetting('_i2', 'at-minimum')])
    const s = scenarioReport(
      multipleInputs(scenarioSpec, undefined, [inputDesc(i1, 66), inputDesc(i2, 'at-minimum')]),
      'passed',
      []
    )
    expect(scenarioMessage(s, bold)).toBe('when _I1_ is _66_ and _I2_ is at _minimum_ (0)...')
  })

  it('should work with input group at position', () => {
    const scenarioSpec = inputSettingsSpec([positionSetting('_i1', 'at-minimum'), positionSetting('_i2', 'at-minimum')])
    const s = scenarioReport(
      multipleInputs(scenarioSpec, 'Input Group 1', [inputDesc(i1, 'at-minimum'), inputDesc(i2, 'at-minimum')]),
      'passed',
      []
    )
    expect(scenarioMessage(s, bold)).toBe('when all inputs in _Input Group 1_ are at _minimum_...')
  })

  it('should handle error case with unknown input group', () => {
    const s: CheckScenarioReport = {
      checkScenario: {
        inputDescs: [],
        error: {
          kind: 'unknown-input-group',
          name: 'Unknown Input Group'
        }
      },
      status: 'error',
      datasets: []
    }

    expect(scenarioMessage(s, bold)).toBe('error: input group _Unknown Input Group_ is unknown')
  })

  it('should handle error case with empty input group', () => {
    const s: CheckScenarioReport = {
      checkScenario: {
        inputDescs: [],
        error: {
          kind: 'empty-input-group',
          name: 'Input Group'
        }
      },
      status: 'error',
      datasets: []
    }

    expect(scenarioMessage(s, bold)).toBe('error: input group _Input Group_ is empty')
  })
})

describe('datasetMessage', () => {
  it('should handle error case', () => {
    const d = errorDatasetReport('Unknown Output')
    expect(datasetMessage(d, bold)).toBe('error: _Unknown Output_ did not match any datasets')
  })

  it('should work with a known dataset', () => {
    const d = datasetReport('Model', 'V1', 'passed', [])
    expect(datasetMessage(d, bold)).toBe('then _V1_...')
  })
})

describe('predicateMessage', () => {
  it('should handle unknown error case', () => {
    const p = errorPredicateReport(1, {
      status: 'error',
      message: 'something bad happened'
    })
    expect(predicateMessage(p, bold)).toBe('error: something bad happened')
  })

  it('should handle error case with unknown dataset', () => {
    const p = errorPredicateReport(1, {
      status: 'error',
      errorInfo: {
        kind: 'unknown-dataset',
        name: 'Unknown X'
      }
    })
    expect(predicateMessage(p, bold)).toBe('error: referenced dataset _Unknown X_ is unknown')
  })

  it('should handle error case with unknown input', () => {
    const p = errorPredicateReport(1, {
      status: 'error',
      errorInfo: {
        kind: 'unknown-input',
        name: 'Unknown Input'
      }
    })
    expect(predicateMessage(p, bold)).toBe('error: referenced input _Unknown Input_ is unknown')
  })

  it('should handle error case with unknown input group', () => {
    const p = errorPredicateReport(1, {
      status: 'error',
      errorInfo: {
        kind: 'unknown-input-group',
        name: 'Unknown Input Group'
      }
    })
    expect(predicateMessage(p, bold)).toBe('error: referenced input group _Unknown Input Group_ is unknown')
  })

  it('should handle error case with empty input group', () => {
    const p = errorPredicateReport(1, {
      status: 'error',
      errorInfo: {
        kind: 'empty-input-group',
        name: 'Input Group'
      }
    })
    expect(predicateMessage(p, bold)).toBe('error: referenced input group _Input Group_ is empty')
  })

  it('should handle failed case with fail value', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'failed', failValue: -1 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ but got _-1_')
  })

  it('should handle failed case with fail value and time', () => {
    const p = predicateReport(1, eqZero, ['== 0'], {
      status: 'failed',
      failValue: -1,
      failTime: 1900
    })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ but got _-1_ in _1900_')
  })

  it('should handle failed case with fail value, ref value, and time', () => {
    const dataRef = opDataRef(dataset('Model', 'Historical X'))
    const p = predicateReport(1, [['approx', dataRef]], [`≈ 'Historical X'`], {
      status: 'failed',
      failValue: -1,
      failOp: 'approx',
      failRefValue: 2,
      failTime: 1900
    })
    expect(predicateMessage(p, bold)).toBe(`should be _≈ 'Historical X'_ but got _-1_ (expected _≈ 2_) in _1900_`)
  })

  it('should handle failed case with fail message', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'failed', message: 'no value' })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ but got _no value_')
  })

  it('should handle failed case with fail message and time', () => {
    const p = predicateReport(1, eqZero, ['== 0'], {
      status: 'failed',
      message: 'no value',
      failTime: 1900
    })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ but got _no value_ in _1900_')
  })

  it('should handle passed case with one op', () => {
    const p = predicateReport(1, eqZero, ['== 0'])
    expect(predicateMessage(p, bold)).toBe('should be _== 0_')
  })

  it('should handle passed case with two ops', () => {
    const p = predicateReport(
      1,
      [
        ['gte', opConstantRef(0)],
        ['lte', opConstantRef(100)]
      ],
      ['>= 0', '<= 100']
    )
    expect(predicateMessage(p, bold)).toBe('should be _>= 0_ and _<= 100_')
  })

  it('should handle passed case with single time', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, 1900)
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _1900_')
  })

  it('should handle passed case with inclusive time range (shorthand)', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, [1900, 2000])
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _[1900, 2000]_')
  })

  it('should handle passed case with after_excl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_excl: 1900 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ after _1900_')
  })

  it('should handle passed case with after_incl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_incl: 1900 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in/after _1900_')
  })

  it('should handle passed case with before_excl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { before_excl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ before _2000_')
  })

  it('should handle passed case with before_incl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { before_incl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in/before _2000_')
  })

  it('should handle passed case with after_excl and before_excl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_excl: 1900, before_excl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _(1900, 2000)_')
  })

  it('should handle passed case with after_excl and before_incl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_excl: 1900, before_incl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _(1900, 2000]_')
  })

  it('should handle passed case with after_incl and before_excl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_incl: 1900, before_excl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _[1900, 2000)_')
  })

  it('should handle passed case with after_incl and before_incl', () => {
    const p = predicateReport(1, eqZero, ['== 0'], { status: 'passed' }, { after_incl: 1900, before_incl: 2000 })
    expect(predicateMessage(p, bold)).toBe('should be _== 0_ in _[1900, 2000]_')
  })
})
