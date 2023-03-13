// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'
import { TaskQueue } from '../../_shared/task-queue'
import type { Scenario } from '../../_shared/scenario'
import type { DatasetKey, DatasetMap } from '../../_shared/types'
import type { BundleModel, BundleGraphData, BundleGraphId } from '../../bundle/bundle-types'

export type CompareDataRequestKey = string

interface DatasetRequest {
  kind: 'dataset'
  scenario: Scenario
  datasetKeys: DatasetKey[]
}

interface GraphDataRequest {
  kind: 'graph-data'
  bundle: 'left' | 'right'
  scenario: Scenario
  graphId: BundleGraphId
}

type DataRequest = DatasetRequest | GraphDataRequest

interface DatasetResponse {
  kind: 'dataset'
  datasetMapL: DatasetMap
  datasetMapR: DatasetMap
}

interface GraphDataResponse {
  kind: 'graph-data'
  graphData?: BundleGraphData
}

type DataResponse = DatasetResponse | GraphDataResponse

/**
 * Coordinates loading of data in parallel from two models.
 */
export class CompareDataCoordinator {
  private readonly taskQueue: TaskQueue<DataRequest, DataResponse>

  constructor(public readonly bundleModelL: BundleModel, public readonly bundleModelR: BundleModel) {
    this.taskQueue = new TaskQueue({
      process: async request => {
        switch (request.kind) {
          case 'dataset': {
            // Run the models for this scenario (in parallel)
            const [resultL, resultR] = await Promise.all([
              this.bundleModelL.getDatasetsForScenario(request.scenario, request.datasetKeys),
              this.bundleModelR.getDatasetsForScenario(request.scenario, request.datasetKeys)
            ])
            return {
              kind: 'dataset',
              datasetMapL: resultL.datasetMap,
              datasetMapR: resultR.datasetMap
            }
          }
          case 'graph-data': {
            // Run the selected model for this scenario
            const bundleModel = request.bundle === 'right' ? this.bundleModelR : this.bundleModelL
            const graphData = await bundleModel.getGraphDataForScenario(request.scenario, request.graphId)
            return {
              kind: 'graph-data',
              graphData
            }
          }
          default:
            assertNever(request)
        }
      }
    })
  }

  requestDatasetMaps(
    requestKey: CompareDataRequestKey,
    scenario: Scenario,
    datasetKeys: DatasetKey[],
    onResponse: (datasetMapL: DatasetMap, datasetMapR: DatasetMap) => void
  ): void {
    const request: DatasetRequest = {
      kind: 'dataset',
      scenario,
      datasetKeys
    }
    this.taskQueue.addTask(requestKey, request, response => {
      if (response.kind === 'dataset') {
        onResponse(response.datasetMapL, response.datasetMapR)
      }
    })
  }

  requestGraphData(
    requestKey: CompareDataRequestKey,
    bundle: 'left' | 'right',
    scenario: Scenario,
    graphId: BundleGraphId,
    onResponse: (graphData: BundleGraphData) => void
  ): void {
    const request: GraphDataRequest = {
      kind: 'graph-data',
      bundle,
      scenario,
      graphId
    }
    this.taskQueue.addTask(requestKey, request, response => {
      if (response.kind === 'graph-data') {
        onResponse(response.graphData)
      }
    })
  }

  cancelRequest(key: CompareDataRequestKey): void {
    this.taskQueue.cancelTask(key)
  }
}
