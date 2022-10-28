// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { actionForPredicate } from './check-action'
import { dataRef } from './check-data-ref'
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
            dataset: checkDataset('Model', 'Y'),
            scenario: {
              inputDescs: [{ name: 'Unknown Input' }]
            }
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
