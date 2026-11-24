// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { actionForPredicate } from './check-action'
import { dataRef, sumDataRef } from './check-data-ref'
import type { CheckTask } from './check-planner'
import { runCheck } from './check-runner'
import { dataset as checkDataset } from './_mocks/mock-check-dataset'
import { allAtPos } from './_mocks/mock-check-scenario'

describe('runCheck', () => {
  it('should return correct result for passed check', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({ gte: 0 })
    }

    const dataset = new Map([
      [2000, 0],
      [2050, 1],
      [2100, 2]
    ])

    const result = runCheck(task, dataset, undefined)
    expect(result).toEqual({ status: 'passed' })
  })

  it('should return correct result for failed check', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({ gte: 3 })
    }

    const dataset = new Map([
      [2000, 0],
      [2050, 1],
      [2100, 2]
    ])

    const result = runCheck(task, dataset, undefined)
    expect(result).toEqual({
      status: 'failed',
      failValue: 0,
      failTime: 2000
    })
  })

  it('should return correct error result when primary dataset is undefined', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({ gte: 0 })
    }

    const result = runCheck(task, undefined, undefined)
    expect(result).toEqual({
      status: 'error',
      message: 'no data available'
    })
  })

  it('should return correct result for passed check that references the sum of multiple datasets', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        approx: {
          op: 'sum',
          datasets: ['Y', 'Z']
        },
        tolerance: 0.01
      }),
      dataRefs: new Map([['approx', sumDataRef([checkDataset('Model', 'Y'), checkDataset('Model', 'Z')])]])
    }

    const dataset = new Map([
      [2000, 3],
      [2050, 7],
      [2100, 11]
    ])

    const refDatasets = new Map([
      [
        'all_inputs_at_default::Model_y',
        new Map([
          [2000, 1],
          [2050, 3],
          [2100, 5]
        ])
      ],
      [
        'all_inputs_at_default::Model_z',
        new Map([
          [2000, 2],
          [2050, 4],
          [2100, 6]
        ])
      ]
    ])

    const result = runCheck(task, dataset, refDatasets)
    expect(result).toEqual({ status: 'passed' })
  })

  it('should return correct result for failed check that references the sum of multiple datasets', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        approx: {
          op: 'sum',
          datasets: ['Y', 'Z']
        },
        tolerance: 0.01
      }),
      dataRefs: new Map([['approx', sumDataRef([checkDataset('Model', 'Y'), checkDataset('Model', 'Z')])]])
    }

    const dataset = new Map([
      [2000, 3],
      [2050, 7],
      [2100, 99]
    ])

    const refDatasets = new Map([
      [
        'all_inputs_at_default::Model_y',
        new Map([
          [2000, 1],
          [2050, 3],
          [2100, 5]
        ])
      ],
      [
        'all_inputs_at_default::Model_z',
        new Map([
          [2000, 2],
          [2050, 4],
          [2100, 6]
        ])
      ]
    ])

    const result = runCheck(task, dataset, refDatasets)
    expect(result).toEqual({
      status: 'failed',
      failValue: 99,
      failOp: 'approx',
      failRefValue: 11,
      failTime: 2100
    })
  })

  it('should return correct error result when one of the summed datasets cannot be resolved', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        approx: {
          op: 'sum',
          datasets: ['Y', 'Unknown Z']
        }
      }),
      dataRefs: new Map([['approx', sumDataRef([checkDataset('Model', 'Y'), { name: 'Unknown Z' }])]])
    }

    const dataset = new Map([
      [2000, 3],
      [2050, 7],
      [2100, 11]
    ])

    const refDatasets = new Map([
      [
        'all_inputs_at_default::Model_y',
        new Map([
          [2000, 1],
          [2050, 3],
          [2100, 5]
        ])
      ]
    ])

    const result = runCheck(task, dataset, refDatasets)
    expect(result).toEqual({
      status: 'error',
      errorInfo: {
        kind: 'unknown-dataset',
        name: 'Unknown Z'
      }
    })
  })

  it('should return correct error result when referenced dataset cannot be resolved', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        gte: {
          dataset: checkDataset('Model', 'Unknown Y')
        }
      }),
      dataRefs: new Map([['gte', dataRef({ name: 'Unknown Y' })]])
    }

    const dataset = new Map([
      [2000, 0],
      [2050, 1],
      [2100, 2]
    ])

    const result = runCheck(task, dataset, undefined)
    expect(result).toEqual({
      status: 'error',
      errorInfo: {
        kind: 'unknown-dataset',
        name: 'Unknown Y'
      }
    })
  })

  it('should return correct error result when referenced input cannot be resolved', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        gte: {
          dataset: checkDataset('Model', 'Y'),
          scenario: {
            input: 'Unknown Input',
            at: 'min'
          }
        }
      }),
      dataRefs: new Map([
        [
          'gte',
          {
            refs: [
              {
                dataset: checkDataset('Model', 'Y'),
                scenario: {
                  inputDescs: [{ name: 'Unknown Input' }]
                }
              }
            ]
          }
        ]
      ])
    }

    const dataset = new Map([
      [2000, 0],
      [2050, 1],
      [2100, 2]
    ])

    const result = runCheck(task, dataset, undefined)
    expect(result).toEqual({
      status: 'error',
      errorInfo: {
        kind: 'unknown-input',
        name: 'Unknown Input'
      }
    })
  })

  it('should return correct error result when referenced input group cannot be resolved', () => {
    const task: CheckTask = {
      scenario: allAtPos('at-default'),
      dataset: checkDataset('Model', 'X'),
      action: actionForPredicate({
        gte: {
          dataset: checkDataset('Model', 'Y'),
          scenario: {
            input: 'Unknown Input',
            at: 'min'
          }
        }
      }),
      dataRefs: new Map([
        [
          'gte',
          {
            refs: [
              {
                dataset: checkDataset('Model', 'Y'),
                scenario: {
                  inputDescs: [],
                  error: {
                    kind: 'unknown-input-group',
                    name: 'Unknown Input Group'
                  }
                }
              }
            ]
          }
        ]
      ])
    }

    const dataset = new Map([
      [2000, 0],
      [2050, 1],
      [2100, 2]
    ])

    const result = runCheck(task, dataset, undefined)
    expect(result).toEqual({
      status: 'error',
      errorInfo: {
        kind: 'unknown-input-group',
        name: 'Unknown Input Group'
      }
    })
  })
})
