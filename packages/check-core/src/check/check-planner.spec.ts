// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Dataset } from '../_shared/types'
import type { ModelSpec } from '../bundle/bundle-types'
import type { CheckDataRef } from './check-data-ref'
import { dataRef } from './check-data-ref'
import { parseTestYaml } from './check-parser'
import type { CheckPlanPredicate } from './check-planner'
import { CheckPlanner } from './check-planner'
import type { CheckPredicateOp } from './check-predicate'
import { dataset, dimension, implVar, outputVar } from './_mocks/mock-check-dataset'
import { datasetPlan, groupPlan, predPlan, scenarioPlan, testPlan } from './_mocks/mock-check-plan'
import { allAtPos, inputAtPos, inputAtValue, inputVar } from './_mocks/mock-check-scenario'

describe('CheckPlanner', () => {
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map([inputVar('1', 'I1'), inputVar('2', 'I2')]),
    outputVars: new Map([outputVar('V1'), outputVar('V2[A1]')]),
    implVars: new Map([implVar('V1'), implVar('V2', [dimension('A')]), implVar('V3'), implVar('V4', [dimension('A')])])
  }

  const i1 = modelSpec.inputVars.get('_i1')
  const i2 = modelSpec.inputVars.get('_i2')

  it('should build a plan that includes checks for everything in the test spec', () => {
    const yamlString = `
- describe: group1
  tests:
    - it: test1
      datasets:
        - name: V1
      predicates:
        - gte: 1
        - lte: 5
    - it: test2
      scenarios:
        - preset: matrix
      datasets:
        - name: v4
      predicates:
        - gte: 2
        - lte: 4
    - it: test3
      scenarios:
        - with: I1
          at: 75
      datasets:
        - name: V3
      predicates:
        - eq: 1
    - it: test4
      datasets:
        - name: V1
      predicates:
        - eq:
            dataset:
              name: V3
    - it: test5
      scenarios:
        - with: I1
          at: 75
      datasets:
        - name: V1
      predicates:
        - eq:
            dataset:
              name: V3
            scenario: inherit
`

    const checkSpecResult = parseTestYaml([yamlString])
    if (checkSpecResult.isErr()) {
      // TODO: fail is not defined in Jest 27; need to throw instead:
      //   https://github.com/facebook/jest/issues/11698#issuecomment-922351139
      throw new Error(`Failed to parse yaml: ${checkSpecResult.error}`)
    }
    const checkSpec = checkSpecResult.value
    const planner = new CheckPlanner(modelSpec)
    planner.addAllChecks(checkSpec, false)

    type PredPlansFunc = (...keys: number[]) => CheckPlanPredicate[]

    const predPlans1: PredPlansFunc = (k0, k1) => [predPlan(k0, { gte: 1 }), predPlan(k1, { lte: 5 })]
    const predPlans2: PredPlansFunc = (k0, k1) => [predPlan(k0, { gte: 2 }), predPlan(k1, { lte: 4 })]
    const predPlans3: PredPlansFunc = k0 => [predPlan(k0, { eq: 1 })]
    const dataRefs4: Map<CheckPredicateOp, CheckDataRef> = new Map([['eq', dataRef(dataset('ModelImpl', 'V3'))]])
    const predPlans4: PredPlansFunc = k0 => [predPlan(k0, { eq: { dataset: { name: 'V3' } } }, dataRefs4)]
    const dataRefs5: Map<CheckPredicateOp, CheckDataRef> = new Map([
      ['eq', dataRef(dataset('ModelImpl', 'V3'), inputAtValue(i1, 75))]
    ])
    const predPlans5: PredPlansFunc = k0 => [
      predPlan(k0, { eq: { dataset: { name: 'V3' }, scenario: 'inherit' } }, dataRefs5)
    ]

    const plan = planner.buildPlan()
    expect(plan.groups.length).toBe(1)
    // XXX: We compare stringified objects here as a workaround for the way Jest handles
    // objects that contain functions (as is the case for our action function), see:
    //   https://github.com/facebook/jest/issues/8475#issuecomment-537830532
    const actualGroup = JSON.parse(JSON.stringify(plan.groups[0]))
    const expectedGroup = JSON.parse(
      JSON.stringify(
        groupPlan('group1', [
          testPlan('test1', [scenarioPlan(allAtPos('at-default'), [datasetPlan('Model', 'V1', [], predPlans1(1, 2))])]),
          testPlan('test2', [
            scenarioPlan(allAtPos('at-default'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(3, 4)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(5, 6))
            ]),
            scenarioPlan(allAtPos('at-minimum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(7, 8)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(9, 10))
            ]),
            scenarioPlan(allAtPos('at-maximum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(11, 12)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(13, 14))
            ]),
            scenarioPlan(inputAtPos(i1, 'at-minimum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(15, 16)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(17, 18))
            ]),
            scenarioPlan(inputAtPos(i1, 'at-maximum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(19, 20)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(21, 22))
            ]),
            scenarioPlan(inputAtPos(i2, 'at-minimum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(23, 24)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(25, 26))
            ]),
            scenarioPlan(inputAtPos(i2, 'at-maximum'), [
              datasetPlan('ModelImpl', 'V4', ['A1'], predPlans2(27, 28)),
              datasetPlan('ModelImpl', 'V4', ['A2'], predPlans2(29, 30))
            ])
          ]),
          testPlan('test3', [scenarioPlan(inputAtValue(i1, 75), [datasetPlan('ModelImpl', 'V3', [], predPlans3(31))])]),
          testPlan('test4', [scenarioPlan(allAtPos('at-default'), [datasetPlan('Model', 'V1', [], predPlans4(32))])]),
          testPlan('test5', [scenarioPlan(inputAtValue(i1, 75), [datasetPlan('Model', 'V1', [], predPlans5(33))])])
        ])
      )
    )
    expect(actualGroup).toEqual(expectedGroup)

    expect(plan.tasks.size).toBe(33)

    const task1 = plan.tasks.get(1)
    expect(task1.scenario).toEqual(allAtPos('at-default'))
    expect(task1.dataset).toEqual(dataset('Model', 'V1'))
    const data1: Dataset = new Map()
    data1.set(2000, 2)
    data1.set(2100, 3)
    expect(task1.action.run(data1)).toEqual({
      status: 'passed'
    })
    const data2: Dataset = new Map()
    data2.set(2000, 0)
    data2.set(2100, 3)
    expect(task1.action.run(data2)).toEqual({
      status: 'failed',
      failValue: 0,
      failTime: 2000
    })

    const task2 = plan.tasks.get(32)
    expect(task2.scenario).toEqual(allAtPos('at-default'))
    expect(task2.dataset).toEqual(dataset('Model', 'V1'))
    expect(task2.dataRefs).toEqual(dataRefs4)

    const task3 = plan.tasks.get(33)
    expect(task3.scenario).toEqual(inputAtValue(i1, 75))
    expect(task3.dataset).toEqual(dataset('Model', 'V1'))
    expect(task3.dataRefs).toEqual(dataRefs5)

    expect(plan.dataRefs.size).toBe(2)
    const ref1 = plan.dataRefs.get('all_inputs_at_default::ModelImpl_v3')
    expect(ref1).toEqual({
      key: 'all_inputs_at_default::ModelImpl_v3',
      dataset: dataset('ModelImpl', 'V3'),
      scenario: allAtPos('at-default')
    })

    const ref2 = plan.dataRefs.get('inputs__i1_at_75::ModelImpl_v3')
    expect(ref2).toEqual({
      key: 'inputs__i1_at_75::ModelImpl_v3',
      dataset: dataset('ModelImpl', 'V3'),
      scenario: inputAtValue(i1, 75)
    })
  })
})
