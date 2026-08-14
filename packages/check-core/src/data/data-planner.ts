// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConstantOverride, LookupOverride, ScenarioSpec, ScenarioSpecUid } from '../_shared/scenario-spec-types'
import type { Dataset, DatasetKey } from '../_shared/types'

export interface DatasetPair {
  datasetL?: Dataset
  datasetR?: Dataset
}

/** A function that performs an action on a pair of fetched datasets. */
export type DataAction = (datasets: DatasetPair) => void

/** A task that performs an action on one or both dataset requested from the models. */
export interface DataTask {
  /** The key for the dataset to be fetched from each model for a given scenario. */
  datasetKey: DatasetKey
  /** The action to be performed with the fetched datasets. */
  dataAction: DataAction
}

export interface DataRequest {
  scenarioSpecL?: ScenarioSpec
  scenarioSpecR?: ScenarioSpec
  constantsL?: ConstantOverride[]
  constantsR?: ConstantOverride[]
  lookupsL?: LookupOverride[]
  lookupsR?: LookupOverride[]
  dataTasks: DataTask[]
}

export interface DataPlan {
  requests: DataRequest[]
}

/**
 * Tracks all requests for data (from model runs) that are made by "check" and/or "comparison" tests.
 *
 * A data request can be made for both models ("left" AND "right", as is the case for most comparison tests),
 * or for just one model (e.g., "right" only, as is the case for "check" tests, or "left" only in the case of
 * comparison tests where an input can only be tested in the "left" model).
 *
 * The goal is to take all requests into account to create a plan that requires the least number of model
 * runs.  Each request ideally fetches data by running both "left" and "right" models in parallel.  When
 * we build up the list of requests, we track which ones:
 *   - access both models ("LR" requests)
 *   - access left model only ("L" requests)
 *   - access right model only ("R" requests)
 *
 * After all requests have been made, `buildPlan` builds an optimal set of data requests by folding
 * "L" and "R" requests in with compatible "LR" requests.  For example, suppose we have one "check" test
 * (that only needs the "right" model), and one "comparison" test (that needs both "left" and "right"),
 * and both tests are exercising the same input scenario:
 *
 *   request1: { scenarioL: undefined, scenarioR: scenario1, dataTasks: [task1] }
 *   request2: { scenarioL: scenario1, scenarioR: scenario1, dataTasks: [task2] }
 *
 * In this case, we can merge them into a single request that runs the models once in parallel:
 *
 *   requestM: { scenarioL: scenario1, scenarioR: scenario1, dataTasks: [task1, task2] }
 */
export class DataPlanner {
  /** Tasks that need to access both "left" and "right" models in parallel. */
  private readonly taskSetsLR: Map<ScenarioPairUid, DataTaskSet> = new Map()

  /** Tasks that only need to access the "left" model. */
  private readonly taskSetsL: Map<ScenarioSpecUid, DataTaskSet> = new Map()

  /** Tasks that only need to access the "right" model. */
  private readonly taskSetsR: Map<ScenarioSpecUid, DataTaskSet> = new Map()

  private complete = false

  /**
   * @param batchSize The maximum number of impl vars that can be fetched
   * with a single request; this is usually the same as the number of
   * normal model outputs.
   */
  constructor(private readonly batchSize: number) {}

  /**
   * Add a request to the plan for the given scenario(s) and data task.
   *
   * @param scenarioSpecL The input scenario used to configure the "left" model, or undefined if no data
   * is needed from the left model.
   * @param scenarioSpecR The input scenario used to configure the "right" model, or undefined if no data
   * is needed from the right model.
   * @param datasetKey The key for the dataset to be fetched from each model for the given scenario.
   * @param dataAction The action to be performed with the fetched datasets.
   * @param constantsL Optional constant overrides for the "left" model.
   * @param constantsR Optional constant overrides for the "right" model.
   * @param lookupsL Optional lookup overrides for the "left" model.
   * @param lookupsR Optional lookup overrides for the "right" model.
   */
  addRequest(
    scenarioSpecL: ScenarioSpec | undefined,
    scenarioSpecR: ScenarioSpec | undefined,
    datasetKey: DatasetKey,
    dataAction: DataAction,
    constantsL?: ConstantOverride[],
    constantsR?: ConstantOverride[],
    lookupsL?: LookupOverride[],
    lookupsR?: LookupOverride[]
  ): void {
    if (scenarioSpecL === undefined && scenarioSpecR === undefined) {
      console.warn('WARNING: Both scenario specs are undefined for DataPlanner request, skipping')
      return
    }

    // Determine which set this request will be added to
    let taskSetsMap: Map<ScenarioPairUid, DataTaskSet>
    let uid: string
    if (scenarioSpecL && scenarioSpecR) {
      taskSetsMap = this.taskSetsLR
      uid = scenarioPairUid(scenarioSpecL, scenarioSpecR, constantsL, constantsR, lookupsL, lookupsR)
    } else if (scenarioSpecR) {
      taskSetsMap = this.taskSetsR
      uid = scenarioPairUid(undefined, scenarioSpecR, undefined, constantsR, undefined, lookupsR)
    } else {
      taskSetsMap = this.taskSetsL
      uid = scenarioPairUid(scenarioSpecL, undefined, constantsL, undefined, lookupsL, undefined)
    }

    // Add the task to the appropriate task set (creating a new set if needed)
    let taskSet = taskSetsMap.get(uid)
    if (!taskSet) {
      taskSet = new DataTaskSet(scenarioSpecL, scenarioSpecR, constantsL, constantsR, lookupsL, lookupsR)
      taskSetsMap.set(uid, taskSet)
    }
    taskSet.addTask({
      datasetKey,
      dataAction
    })
  }

  /**
   * Build a plan that minimizes the number of data fetches needed.
   */
  buildPlan(): DataPlan {
    if (this.complete) {
      throw new Error('DataPlanner.buildPlan() can only be called once')
    }
    this.complete = true

    // Create mappings to make it easy to look up "LR" task sets using only
    // an "L" or "R" side key (which incorporates the scenario uid plus any
    // constant and lookup overrides).  This will create a mapping to the first
    // available set with a matching "L" side key (in case there are multiple
    // with the same "L" key but different "R" keys), and same for "R" keys.
    type SideKey = string
    const lKeyMappings: Map<SideKey, ScenarioPairUid> = new Map()
    const rKeyMappings: Map<SideKey, ScenarioPairUid> = new Map()
    for (const lrUid of this.taskSetsLR.keys()) {
      const parsed = parsePairUid(lrUid)
      const lKey = sideKey(parsed.lScenarioUid, parsed.lConstUid, parsed.lLookupUid)
      const rKey = sideKey(parsed.rScenarioUid, parsed.rConstUid, parsed.rLookupUid)
      if (parsed.lScenarioUid && !lKeyMappings.has(lKey)) {
        lKeyMappings.set(lKey, lrUid)
      }
      if (parsed.rScenarioUid && !rKeyMappings.has(rKey)) {
        rKeyMappings.set(rKey, lrUid)
      }
    }

    // See if we can fold "L-only" and "R-only" requests into an existing "LR" set
    function merge(
      taskSetsLR: Map<ScenarioPairUid, DataTaskSet>,
      taskSetsForSide: Map<ScenarioPairUid, DataTaskSet>,
      keyMappingsForSide: Map<SideKey, ScenarioPairUid>,
      side: 'L' | 'R'
    ) {
      for (const [pairUidForSide, taskSetForSide] of taskSetsForSide.entries()) {
        // Extract the side-specific key from the pair uid (the L-only/R-only
        // pair uid encodes the populated side and leaves the other side empty)
        const parsed = parsePairUid(pairUidForSide)
        const scenarioUid = side === 'L' ? parsed.lScenarioUid : parsed.rScenarioUid
        const constUid = side === 'L' ? parsed.lConstUid : parsed.rConstUid
        const lookupUid = side === 'L' ? parsed.lLookupUid : parsed.rLookupUid
        const sKey = sideKey(scenarioUid, constUid, lookupUid)

        const lrKey = keyMappingsForSide.get(sKey)
        if (lrKey) {
          // Fold the one-side-only requests into an existing "LR" set
          const taskSetLR = taskSetsLR.get(lrKey)
          taskSetLR.merge(taskSetForSide)

          // Remove from the one-side-only set
          taskSetsForSide.delete(pairUidForSide)
        }
      }
    }
    merge(this.taskSetsLR, this.taskSetsL, lKeyMappings, 'L')
    merge(this.taskSetsLR, this.taskSetsR, rKeyMappings, 'R')

    // Build the final array of requests
    const requests: DataRequest[] = []
    const batchSize = this.batchSize
    function addRequests(taskSets: IterableIterator<DataTaskSet>) {
      for (const taskSet of taskSets) {
        requests.push(...taskSet.buildRequests(batchSize))
      }
    }
    addRequests(this.taskSetsLR.values())
    addRequests(this.taskSetsL.values())
    addRequests(this.taskSetsR.values())

    return {
      requests
    }
  }
}

/**
 * Groups together all data tasks that are associated with a pair of scenarios.
 */
class DataTaskSet {
  private readonly modelTasks: Map<DatasetKey, DataTask[]> = new Map()
  private readonly modelImplTasks: Map<DatasetKey, DataTask[]> = new Map()

  constructor(
    private readonly scenarioSpecL: ScenarioSpec | undefined,
    private readonly scenarioSpecR: ScenarioSpec | undefined,
    private readonly constantsL: ConstantOverride[] | undefined,
    private readonly constantsR: ConstantOverride[] | undefined,
    private readonly lookupsL: LookupOverride[] | undefined,
    private readonly lookupsR: LookupOverride[] | undefined
  ) {}

  /**
   * Add a task that will be performed when the data is fetched for the scenario(s)
   * associated with this task set.
   *
   * @param dataTask A task that performs an action using the fetched dataset(s).
   */
  addTask(dataTask: DataTask): void {
    // Separate "Model" keys from "ModelImpl" keys; the former are pulled
    // from normal model runs, but the latter need special model runs
    // that extract specific datasets
    // TODO: For now, treat any non-ModelImpl data as "Model"; we may
    // want to group external datasets separately
    let taskMap: Map<DatasetKey, DataTask[]>
    if (dataTask.datasetKey.startsWith('ModelImpl')) {
      taskMap = this.modelImplTasks
    } else {
      taskMap = this.modelTasks
    }

    // Add the task to the map
    let tasks = taskMap.get(dataTask.datasetKey)
    if (!tasks) {
      tasks = []
      taskMap.set(dataTask.datasetKey, tasks)
    }
    tasks.push(dataTask)
  }

  /**
   * Add all tasks from the given set into this set.
   *
   * @param otherTaskSet The other task set that will be merged into this one.
   */
  merge(otherTaskSet: DataTaskSet): void {
    for (const tasks of otherTaskSet.modelTasks.values()) {
      for (const task of tasks) {
        this.addTask(task)
      }
    }
    for (const tasks of otherTaskSet.modelImplTasks.values()) {
      for (const task of tasks) {
        this.addTask(task)
      }
    }
  }

  /**
   * Create one or more data requests that can be used to fetch data for the configured scenario(s).
   *
   * @param batchSize The maximum number of impl vars that can be fetched with a single request.
   * This is usually the same as the number of normal model outputs.
   */
  buildRequests(batchSize: number): DataRequest[] {
    const dataRequests: DataRequest[] = []

    if (this.modelTasks.size > 0) {
      // Schedule a normal model run
      const dataTasks: DataTask[] = []
      this.modelTasks.forEach(tasks => dataTasks.push(...tasks))
      dataRequests.push({
        scenarioSpecL: this.scenarioSpecL,
        scenarioSpecR: this.scenarioSpecR,
        constantsL: this.constantsL,
        constantsR: this.constantsR,
        lookupsL: this.lookupsL,
        lookupsR: this.lookupsR,
        dataTasks
      })
    }

    if (this.modelImplTasks.size > 0) {
      // Create batches of datasets.  The model can only accept a
      // limited number of keys per run, up to N keys, where N is the
      // number of normal outputs specified for the model.  If there
      // are more than N datasets to be accessed, we break those up
      // into batches of N datasets.
      const allKeys = [...this.modelImplTasks.keys()]
      for (let i = 0; i < allKeys.length; i += batchSize) {
        const batchKeys = allKeys.slice(i, i + batchSize)
        const dataTasks: DataTask[] = []
        for (const datasetKey of batchKeys) {
          dataTasks.push(...this.modelImplTasks.get(datasetKey))
        }
        dataRequests.push({
          scenarioSpecL: this.scenarioSpecL,
          scenarioSpecR: this.scenarioSpecR,
          constantsL: this.constantsL,
          constantsR: this.constantsR,
          lookupsL: this.lookupsL,
          lookupsR: this.lookupsR,
          dataTasks
        })
      }
    }

    return dataRequests
  }
}

/**
 * An ID that includes one or two scenario UIDs to uniquely identify a pair of scenarios
 * along with any constant and lookup overrides.
 *
 * The format is `<left_scenario_uid>::<right_scenario_uid>` optionally followed by
 * `##<constants_uid_l>||<constants_uid_r>` (when constant overrides are present), and/or
 * `%%<lookups_uid_l>||<lookups_uid_r>` (when lookup overrides are present).
 */
type ScenarioPairUid = string

/**
 * Create a stable string representation of constant overrides for use in UIDs.
 * Sorts by varId to ensure consistent ordering.
 */
function constantsUid(constants: ConstantOverride[] | undefined): string {
  if (!constants || constants.length === 0) {
    return ''
  }
  // Sort by varId to ensure consistent ordering
  const sorted = [...constants].sort((a, b) => a.varId.localeCompare(b.varId))
  return sorted.map(c => `${c.varId}=${c.value}`).join(',')
}

/**
 * Create a stable string representation of lookup overrides for use in UIDs.
 * Sorts by varId to ensure consistent ordering.  Uses bracketed point lists so
 * that an undefined `points` array (a "reset" override) is distinguishable from
 * an empty `points` array.
 */
function lookupsUid(lookups: LookupOverride[] | undefined): string {
  if (!lookups || lookups.length === 0) {
    return ''
  }
  // Sort by varId to ensure consistent ordering
  const sorted = [...lookups].sort((a, b) => a.varId.localeCompare(b.varId))
  return sorted
    .map(l => {
      if (l.points === undefined) {
        return `${l.varId}=`
      }
      return `${l.varId}=[${l.points.join(',')}]`
    })
    .join(';')
}

/**
 * Build a side-only key (used for matching L-only and R-only requests against
 * compatible LR pairs).  The format mirrors the per-side encoding used inside
 * a `ScenarioPairUid`.
 */
function sideKey(scenarioUid: string, constUid: string, lookupUid: string): string {
  let key = scenarioUid
  if (constUid) {
    key += `##${constUid}`
  }
  if (lookupUid) {
    key += `%%${lookupUid}`
  }
  return key
}

interface ParsedPairUid {
  lScenarioUid: string
  rScenarioUid: string
  lConstUid: string
  rConstUid: string
  lLookupUid: string
  rLookupUid: string
}

/**
 * Parse a `ScenarioPairUid` back into its component parts so the buildPlan logic
 * can reason about scenario and override compatibility.
 */
function parsePairUid(pairUid: string): ParsedPairUid {
  let rest = pairUid

  // Extract the lookups section (if present); it always appears after the
  // constants section, so split on `%%` first
  let lookupsPart = ''
  const lookupsIdx = rest.indexOf('%%')
  if (lookupsIdx >= 0) {
    lookupsPart = rest.substring(lookupsIdx + 2)
    rest = rest.substring(0, lookupsIdx)
  }

  // Extract the constants section (if present)
  let constantsPart = ''
  const constantsIdx = rest.indexOf('##')
  if (constantsIdx >= 0) {
    constantsPart = rest.substring(constantsIdx + 2)
    rest = rest.substring(0, constantsIdx)
  }

  // The remainder is the scenario part: `<lScenario>::<rScenario>`
  const scenarioParts = rest.split('::')
  const lScenarioUid = scenarioParts[0] ?? ''
  const rScenarioUid = scenarioParts[1] ?? ''

  // Each override section uses `||` to separate L and R encodings
  const constantsParts = constantsPart.split('||')
  const lConstUid = constantsPart ? (constantsParts[0] ?? '') : ''
  const rConstUid = constantsPart ? (constantsParts[1] ?? '') : ''

  const lookupsParts = lookupsPart.split('||')
  const lLookupUid = lookupsPart ? (lookupsParts[0] ?? '') : ''
  const rLookupUid = lookupsPart ? (lookupsParts[1] ?? '') : ''

  return { lScenarioUid, rScenarioUid, lConstUid, rConstUid, lLookupUid, rLookupUid }
}

/**
 * Create a unique identifier for the given scenarios and overrides.
 *
 * For example, a request that includes scenarios for both left and right might look like:
 *   scenario1::scenario1
 *
 * A request that only accesses the right model might use a key like:
 *   ::scenario1
 *
 * A request that only accesses the left model might use a key like:
 *   scenario1::
 *
 * If constant overrides are provided, they are appended via a `##` section:
 *   scenario1::scenario1##_c1=5,_c2=10||_c1=5
 *
 * If lookup overrides are provided, they are appended via a `%%` section (after
 * any constants section):
 *   scenario1::scenario1%%_l1=[0,0,1,10]||_l1=[0,0,1,10]
 *
 * @param scenarioSpecL The input scenario used to configure the "left" model, or undefined if no data
 * is needed from the left model.
 * @param scenarioSpecR The input scenario used to configure the "right" model, or undefined if no data
 * is needed from the right model.
 * @param constantsL Optional constant overrides for the "left" model.
 * @param constantsR Optional constant overrides for the "right" model.
 * @param lookupsL Optional lookup overrides for the "left" model.
 * @param lookupsR Optional lookup overrides for the "right" model.
 */
function scenarioPairUid(
  scenarioSpecL: ScenarioSpec | undefined,
  scenarioSpecR: ScenarioSpec | undefined,
  constantsL: ConstantOverride[] | undefined,
  constantsR: ConstantOverride[] | undefined,
  lookupsL: LookupOverride[] | undefined,
  lookupsR: LookupOverride[] | undefined
): ScenarioPairUid {
  const uidL = scenarioSpecL?.uid || ''
  const uidR = scenarioSpecR?.uid || ''
  let uid = `${uidL}::${uidR}`

  // Append constant overrides if present
  const constUidL = constantsUid(constantsL)
  const constUidR = constantsUid(constantsR)
  if (constUidL || constUidR) {
    uid += `##${constUidL}||${constUidR}`
  }

  // Append lookup overrides if present
  const lookupUidL = lookupsUid(lookupsL)
  const lookupUidR = lookupsUid(lookupsR)
  if (lookupUidL || lookupUidR) {
    uid += `%%${lookupUidL}||${lookupUidR}`
  }

  return uid
}
