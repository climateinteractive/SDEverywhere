// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ConstantOverride, ScenarioSpec } from '../_shared/scenario-spec-types'
import { inputAtValueSpec } from '../_shared/scenario-specs'
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
  scenarioSpecL: ScenarioSpec | undefined,
  scenarioSpecR: ScenarioSpec | undefined,
  datasetKeys: DatasetKey[],
  constantsL?: ConstantOverride[],
  constantsR?: ConstantOverride[]
): DataRequest {
  return {
    scenarioSpecL,
    scenarioSpecR,
    constantsL,
    constantsR,
    dataTasks: datasetKeys.map(noopTask)
  }
}

describe('DataPlanner', () => {
  const s1 = inputAtValueSpec('i1', 1)
  const s2 = inputAtValueSpec('i2', 1)
  const s3 = inputAtValueSpec('i3', 1)

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

  describe('with constant overrides', () => {
    const c1: ConstantOverride = { varId: '_c1', value: 10 }
    const c2: ConstantOverride = { varId: '_c2', value: 20 }
    const c3: ConstantOverride = { varId: '_c1', value: 99 }

    it('should batch requests with the same constant overrides', () => {
      const planner = new DataPlanner(10)
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc, [c1], [c1])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(1)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2'], [c1], [c1]))
    })

    it('should not batch requests with different constant overrides', () => {
      const planner = new DataPlanner(10)
      // Same scenario but different constants should create separate requests
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc, [c2], [c2])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(2)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1'], [c1], [c1]))
      expect(plan.requests[1]).toMatchObject(request(s1, s1, ['Model_v2'], [c2], [c2]))
    })

    it('should not batch requests when one has constants and one does not', () => {
      const planner = new DataPlanner(10)
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc)
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(2)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1'], [c1], [c1]))
      expect(plan.requests[1]).toMatchObject(request(s1, s1, ['Model_v2']))
    })

    it('should not batch requests with same varId but different values', () => {
      const planner = new DataPlanner(10)
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc, [c3], [c3])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(2)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1'], [c1], [c1]))
      expect(plan.requests[1]).toMatchObject(request(s1, s1, ['Model_v2'], [c3], [c3]))
    })

    it('should merge L-only request with LR request when constants match', () => {
      const planner = new DataPlanner(10)
      // LR request with constants
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      // L-only request with same L constants should merge
      planner.addRequest(s1, undefined, 'Model_v2', noopFunc, [c1], undefined)
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(1)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2'], [c1], [c1]))
    })

    it('should not merge L-only request with LR request when constants differ', () => {
      const planner = new DataPlanner(10)
      // LR request with constants
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c1])
      // L-only request with different L constants should NOT merge
      planner.addRequest(s1, undefined, 'Model_v2', noopFunc, [c2], undefined)
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(2)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1'], [c1], [c1]))
      expect(plan.requests[1]).toMatchObject(request(s1, undefined, ['Model_v2'], [c2], undefined))
    })

    it('should merge R-only request with LR request when constants match', () => {
      const planner = new DataPlanner(10)
      // LR request with constants
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c2])
      // R-only request with same R constants should merge
      planner.addRequest(undefined, s1, 'Model_v2', noopFunc, undefined, [c2])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(1)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2'], [c1], [c2]))
    })

    it('should not merge R-only request with LR request when constants differ', () => {
      const planner = new DataPlanner(10)
      // LR request with constants
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1], [c2])
      // R-only request with different R constants should NOT merge
      planner.addRequest(undefined, s1, 'Model_v2', noopFunc, undefined, [c1])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(2)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1'], [c1], [c2]))
      expect(plan.requests[1]).toMatchObject(request(undefined, s1, ['Model_v2'], undefined, [c1]))
    })

    it('should batch requests with multiple constants in same order', () => {
      const planner = new DataPlanner(10)
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1, c2], [c1, c2])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc, [c1, c2], [c1, c2])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(1)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2'], [c1, c2], [c1, c2]))
    })

    it('should batch requests with multiple constants in different order (sorted by varId)', () => {
      const planner = new DataPlanner(10)
      // Constants are sorted by varId when generating the UID, so order shouldn't matter
      planner.addRequest(s1, s1, 'Model_v1', noopFunc, [c1, c2], [c1, c2])
      planner.addRequest(s1, s1, 'Model_v2', noopFunc, [c2, c1], [c2, c1])
      const plan = planner.buildPlan()
      expect(plan.requests.length).toBe(1)
      expect(plan.requests[0]).toMatchObject(request(s1, s1, ['Model_v1', 'Model_v2'], [c1, c2], [c1, c2]))
    })
  })
})
