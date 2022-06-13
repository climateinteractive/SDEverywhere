// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import type { Dataset, DatasetKey, ScenarioKey } from '../_shared/types'

export interface DatasetPair {
  datasetL?: Dataset
  datasetR?: Dataset
}

export type DataRequestKind = 'check' | 'compare'

export type DataFunc = (datasets: DatasetPair) => void

export interface DataTask {
  datasetKey: DatasetKey
  dataFunc: DataFunc
}

export interface DataRequest {
  kind: DataRequestKind
  scenario: Scenario
  dataTasks: DataTask[]
}

export interface DataPlan {
  requests: DataRequest[]
}

class ScenarioTaskSet {
  private readonly modelTasks: Map<DatasetKey, DataTask[]> = new Map()
  private readonly modelImplTasks: Map<DatasetKey, DataTask[]> = new Map()
  private requestKind: DataRequestKind = 'check'

  constructor(private readonly scenario: Scenario) {}

  /**
   * Add a data request for the given dataset along with the function to be
   * called with the fetched dataset.
   *
   * @param kind The request kind, which determines whether to fetch 1 dataset or 2.
   * @param datasetKey The dataset to be fetched for this scenario.
   * @param dataFunc The function to be called with the fetched dataset.
   */
  addTask(kind: DataRequestKind, datasetKey: DatasetKey, dataFunc: DataFunc): void {
    // If a 'compare' request comes in, we need to fetch both datasets; otherwise
    // leave it set to 'check' so that we only need to fetch the dataset from the
    // "current" source
    if (kind === 'compare') {
      this.requestKind = 'compare'
    }

    // Create a task for the requested dataset
    const dataTask: DataTask = {
      datasetKey,
      dataFunc
    }

    // Separate "Model" keys from "ModelImpl" keys; the former are pulled
    // from normal model runs, but the latter need special model runs
    // that extract specific datasets
    // TODO: For now, treat any non-ModelImpl data as "Model"; we may
    // want to group external datasets separately
    let taskMap: Map<DatasetKey, DataTask[]>
    if (datasetKey.startsWith('ModelImpl')) {
      taskMap = this.modelImplTasks
    } else {
      taskMap = this.modelTasks
    }

    // Add the task to the map
    let tasks = taskMap.get(datasetKey)
    if (!tasks) {
      tasks = []
      taskMap.set(datasetKey, tasks)
    }
    tasks.push(dataTask)
  }

  /**
   * Create one or more data requests that can be used to fetch data
   * for this scenario.
   *
   * @param batchSize The maximum number of impl vars that can be fetched
   * with a single request; this is usually the same as the number of
   * normal model outputs.
   */
  buildRequests(batchSize: number): DataRequest[] {
    const dataRequests: DataRequest[] = []

    if (this.modelTasks.size > 0) {
      // Schedule a normal model run
      const dataTasks: DataTask[] = []
      this.modelTasks.forEach(tasks => dataTasks.push(...tasks))
      dataRequests.push({
        kind: this.requestKind,
        scenario: this.scenario,
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
          kind: this.requestKind,
          scenario: this.scenario,
          dataTasks
        })
      }
    }

    return dataRequests
  }
}

export class DataPlanner {
  private readonly scenarioTaskSets: Map<ScenarioKey, ScenarioTaskSet> = new Map()

  /**
   * @param batchSize The maximum number of impl vars that can be fetched
   * with a single request; this is usually the same as the number of
   * normal model outputs.
   */
  constructor(private readonly batchSize: number) {}

  /**
   * Add a scenario and a requested dataset to the plan.
   *
   * @param kind The request kind, which determines whether to fetch 1 dataset or 2.
   * @param scenario The input scenario.
   * @param datasetKey The dataset to be fetched for this scenario.
   * @param dataFunc The function to be called with the fetched dataset.
   */
  addRequest(kind: DataRequestKind, scenario: Scenario, datasetKey: DatasetKey, dataFunc: DataFunc): void {
    let scenarioTaskSet = this.scenarioTaskSets.get(scenario.key)
    if (!scenarioTaskSet) {
      scenarioTaskSet = new ScenarioTaskSet(scenario)
      this.scenarioTaskSets.set(scenario.key, scenarioTaskSet)
    }
    scenarioTaskSet.addTask(kind, datasetKey, dataFunc)
  }

  /**
   * Build a plan that minimizes the number of data fetches needed.
   */
  buildPlan(): DataPlan {
    const requests: DataRequest[] = []
    for (const taskSet of this.scenarioTaskSets.values()) {
      requests.push(...taskSet.buildRequests(this.batchSize))
    }
    return {
      requests
    }
  }
}
