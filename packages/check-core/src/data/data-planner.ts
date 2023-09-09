// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ScenarioSpec, ScenarioSpecUid } from '../_shared/scenario-spec-types'
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
   */
  addRequest(
    scenarioSpecL: ScenarioSpec | undefined,
    scenarioSpecR: ScenarioSpec | undefined,
    datasetKey: DatasetKey,
    dataAction: DataAction
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
      uid = scenarioPairUid(scenarioSpecL, scenarioSpecR)
    } else if (scenarioSpecR) {
      taskSetsMap = this.taskSetsR
      uid = scenarioSpecR.uid
    } else {
      taskSetsMap = this.taskSetsL
      uid = scenarioSpecL.uid
    }

    // Add the task to the appropriate task set (creating a new set if needed)
    let taskSet = taskSetsMap.get(uid)
    if (!taskSet) {
      taskSet = new DataTaskSet(scenarioSpecL, scenarioSpecR)
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
    // an "L" or "R" uid.  This will create a mapping to the first available
    // set with an "L" uid on the left side (in case there are multiple with
    // the same "L" uid but different "R" uids), and same approach for "R" uids.
    const lKeyMappings: Map<ScenarioSpecUid, ScenarioPairUid> = new Map()
    const rKeyMappings: Map<ScenarioSpecUid, ScenarioPairUid> = new Map()
    for (const lrUid of this.taskSetsLR.keys()) {
      const [lUid, rUid] = lrUid.split('::')
      if (!lKeyMappings.has(lUid)) {
        lKeyMappings.set(lUid, lrUid)
      }
      if (!rKeyMappings.has(rUid)) {
        rKeyMappings.set(rUid, lrUid)
      }
    }

    // See if we can fold "L-only" and "R-only" requests into an existing "LR" set
    function merge(
      taskSetsLR: Map<ScenarioPairUid, DataTaskSet>,
      taskSetsForSide: Map<ScenarioSpecUid, DataTaskSet>,
      keyMappingsForSide: Map<ScenarioSpecUid, ScenarioPairUid>
    ) {
      for (const [keyForSide, taskSetForSide] of taskSetsForSide.entries()) {
        const lrKey = keyMappingsForSide.get(keyForSide)
        if (lrKey) {
          // Fold the one-side-only requests into an existing "LR" set
          const taskSetLR = taskSetsLR.get(lrKey)
          taskSetLR.merge(taskSetForSide)

          // Remove from the one-side-only set
          taskSetsForSide.delete(keyForSide)
        }
      }
    }
    merge(this.taskSetsLR, this.taskSetsL, lKeyMappings)
    merge(this.taskSetsLR, this.taskSetsR, rKeyMappings)

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
    private readonly scenarioSpecR: ScenarioSpec | undefined
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
          dataTasks
        })
      }
    }

    return dataRequests
  }
}

/**
 * An ID that includes one or two scenario UIDs to uniquely identify a pair of scenarios.
 * The format is `<left_uid>::<right_uid>`.
 */
type ScenarioPairUid = string

/**
 * Create a unique identifier for the given scenarios.
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
 * @param scenarioSpecL The input scenario used to configure the "left" model, or undefined if no data
 * is needed from the left model.
 * @param scenarioSpecR The input scenario used to configure the "right" model, or undefined if no data
 * is needed from the right model.
 */
function scenarioPairUid(
  scenarioSpecL: ScenarioSpec | undefined,
  scenarioSpecR: ScenarioSpec | undefined
): ScenarioPairUid {
  const uidL = scenarioSpecL?.uid || ''
  const uidR = scenarioSpecR?.uid || ''
  return `${uidL}::${uidR}`
}
