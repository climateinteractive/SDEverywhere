// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Scenario } from '../_shared/scenario'
import { inputAtValueScenario } from '../_shared/scenario'
import type { DatasetKey } from '../_shared/types'

import type { DataRequest, DataTask } from './data-planner'
import { DataPlanner } from './data-planner'

function noopFunc() {
  /* no-op */
}

function noopTask(datasetKey: DatasetKey): DataTask {
  return {
    datasetKey,
    dataAction: noopFunc
  }
}

function request(
  scenarioL: Scenario | undefined,
  scenarioR: Scenario | undefined,
  datasetKeys: DatasetKey[]
): DataRequest {
  return {
    scenarioL,
    scenarioR,
    dataTasks: datasetKeys.map(noopTask)
  }
}

describe('DataPlanner', () => {
  const s1 = inputAtValueScenario('i1', 'i1', 1)
  const s2 = inputAtValueScenario('i2', 'i2', 1)
  const s3 = inputAtValueScenario('i3', 'i3', 1)

  it('should build a basic plan', () => {
    const planner = new DataPlanner(2)

    // The first request accesses s1 in both "L" and "R"; it will get its own request "r1"
    planner.addRequest(s1, s1, 'Model_v1', noopFunc)

    // The second request accesses s2 in "R" only; it will get its own request "r2"
    planner.addRequest(undefined, s2, 'Model_v1', noopFunc)

    // The third request is the same as the previous one (same scenario, but accesses a
    // different external dataset), so it can be grouped with "r2"
    planner.addRequest(undefined, s2, 'External_e1', noopFunc)

    // The fourth request accesses impl datasets, so it needs to be split among multiple
    // requests (2 requests because there are 3 impl variables, and batch size is 2)
    planner.addRequest(undefined, s2, 'ModelImpl_v1', noopFunc)
    planner.addRequest(undefined, s2, 'ModelImpl_v2', noopFunc)
    planner.addRequest(undefined, s2, 'ModelImpl_v2', noopFunc)
    planner.addRequest(undefined, s2, 'ModelImpl_v3', noopFunc)

    // The fifth request accesses s1 in "L" only; it can be grouped with "r1"
    planner.addRequest(s1, undefined, 'Model_v2', noopFunc)

    // The sixth request accesses s3 in "L" only; since we have a request group with a
    // "hole" on the left side (the left model is not being used), we can "upgrade"
    // "r2" to access s3 in "L", which is more efficient than letting the left model
    // sit idle
    // TODO: The following case isn't likely to happen much in practice, so it is left
    // unoptimized for now (will create a new request instead of being merged with another,
    // as described above)
    planner.addRequest(s3, undefined, 'Model_v2', noopFunc)

    // Note that `buildPlan` currently produces "LR" requests, followed by "L-only" requests,
    // followed by "R-only" requests
    const plan = planner.buildPlan()
    expect(plan.requests.length).toBe(5)
    expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2']))
    // TODO: See note above about why the next one is not folded into another request with
    // an empty "left" slot
    expect(plan.requests[1]).toMatchObject(request(s3, undefined, ['Model_v2']))
    expect(plan.requests[2]).toMatchObject(request(undefined, s2, ['Model_v1', 'External_e1']))
    expect(plan.requests[3]).toMatchObject(request(undefined, s2, ['ModelImpl_v1', 'ModelImpl_v2', 'ModelImpl_v2']))
    expect(plan.requests[4]).toMatchObject(request(undefined, s2, ['ModelImpl_v3']))
  })

  it('should include one request when same scenario is added multiple times', () => {
    const planner = new DataPlanner(10)
    planner.addRequest(s1, s1, 'Model_v1', noopFunc)
    planner.addRequest(s1, s1, 'Model_v2', noopFunc)
    const plan = planner.buildPlan()
    expect(plan.requests.length).toBe(1)
    expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2']))
  })
})
