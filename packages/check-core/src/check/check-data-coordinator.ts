// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { TaskQueue } from '../_shared/task-queue'
import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import type { Dataset, DatasetKey } from '../_shared/types'
import type { BundleModel } from '../bundle/bundle-types'

export type CheckDataRequestKey = string

interface DataRequest {
  scenarioSpec: ScenarioSpec
  datasetKey: DatasetKey
}

interface DataResponse {
  dataset: Dataset
}

/**
 * Coordinates on-demand loading of data used to display a graph representation
 * of a check/predicate.
 */
export class CheckDataCoordinator {
  private readonly taskQueue: TaskQueue<DataRequest, DataResponse>

  constructor(public readonly bundleModel: BundleModel) {
    this.taskQueue = new TaskQueue({
      process: async request => {
        // Run the model for this scenario
        const result = await this.bundleModel.getDatasetsForScenario(request.scenarioSpec, [request.datasetKey])
        const dataset = result.datasetMap.get(request.datasetKey)
        return {
          dataset
        }
      }
    })
  }

  requestDataset(
    requestKey: CheckDataRequestKey,
    scenarioSpec: ScenarioSpec,
    datasetKey: DatasetKey,
    onResponse: (dataset: Dataset) => void
  ): void {
    const request: DataRequest = {
      scenarioSpec,
      datasetKey
    }
    this.taskQueue.addTask(requestKey, request, response => {
      onResponse(response.dataset)
    })
  }

  cancelRequest(key: CheckDataRequestKey): void {
    this.taskQueue.cancelTask(key)
  }
}
