// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { inputAtValueScenario } from '../_shared/scenario'
import { DataPlanner } from './data-planner'

describe('DataPlanner', () => {
  const noopFunc = () => {
    /* no-op */
  }

  it('should build a basic plan', () => {
    const planner = new DataPlanner(2)

    // The first scenario gets its own request
    planner.addRequest('compare', inputAtValueScenario('i1', 'i1', 1), 'Model_v1', noopFunc)

    // The second scenario is different, so it gets its own request
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'Model_v1', noopFunc)

    // The third scenario is the same (just accesses a different external dataset),
    // so it reuses the second request
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'External_e1', noopFunc)

    // The fourth scenario accesses impl datasets, so it needs its own requests
    // (2 requests because there are 3 impl variables, and batch size is 2)
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'ModelImpl_v1', noopFunc)
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'ModelImpl_v2', noopFunc)
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'ModelImpl_v2', noopFunc)
    planner.addRequest('check', inputAtValueScenario('i2', 'i2', 1), 'ModelImpl_v3', noopFunc)

    const plan = planner.buildPlan()
    expect(plan.requests.length).toBe(4)
    expect(plan.requests[0]).toMatchObject({
      kind: 'compare',
      scenario: inputAtValueScenario('i1', 'i1', 1),
      dataTasks: [{ datasetKey: 'Model_v1' }]
    })
    expect(plan.requests[1]).toMatchObject({
      kind: 'check',
      scenario: inputAtValueScenario('i2', 'i2', 1),
      dataTasks: [{ datasetKey: 'Model_v1' }, { datasetKey: 'External_e1' }]
    })
    expect(plan.requests[2]).toMatchObject({
      kind: 'check',
      scenario: inputAtValueScenario('i2', 'i2', 1),
      dataTasks: [{ datasetKey: 'ModelImpl_v1' }, { datasetKey: 'ModelImpl_v2' }, { datasetKey: 'ModelImpl_v2' }]
    })
    expect(plan.requests[3]).toMatchObject({
      kind: 'check',
      scenario: inputAtValueScenario('i2', 'i2', 1),
      dataTasks: [{ datasetKey: 'ModelImpl_v3' }]
    })
  })

  it('should include one request when same scenario is added multiple times', () => {
    const planner = new DataPlanner(10)
    planner.addRequest('check', inputAtValueScenario('i1', 'i1', 1), 'Model_v1', noopFunc)
    planner.addRequest('check', inputAtValueScenario('i1', 'i1', 1), 'Model_v2', noopFunc)
    const plan = planner.buildPlan()
    expect(plan.requests.length).toBe(1)
    expect(plan.requests[0]).toMatchObject({
      kind: 'check',
      scenario: inputAtValueScenario('i1', 'i1', 1),
      dataTasks: [{ datasetKey: 'Model_v1' }, { datasetKey: 'Model_v2' }]
    })
  })

  it('should add compare data request if any request has compare kind', () => {
    const planner = new DataPlanner(10)
    planner.addRequest('check', inputAtValueScenario('i1', 'i1', 1), 'Model_v1', noopFunc)
    planner.addRequest('compare', inputAtValueScenario('i1', 'i1', 1), 'Model_v2', noopFunc)
    const plan = planner.buildPlan()
    expect(plan.requests.length).toBe(1)
    expect(plan.requests[0]).toMatchObject({
      kind: 'compare',
      scenario: inputAtValueScenario('i1', 'i1', 1),
      dataTasks: [{ datasetKey: 'Model_v1' }, { datasetKey: 'Model_v2' }]
    })
  })
})
