// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ScenarioSpec } from '../../_shared/scenario-spec-types'
import { TaskQueue } from '../../_shared/task-queue'
import type { DatasetKey, DatasetMap } from '../../_shared/types'

import type { BundleModel, BundleGraphData, BundleGraphId } from '../../bundle/bundle-types'
import type { DatasetsResult } from '../../_shared/data-source'

export type ComparisonDataRequestKey = string

interface DatasetRequest {
  kind: 'dataset'
  scenarioSpecL?: ScenarioSpec
  scenarioSpecR?: ScenarioSpec
  datasetKeys: DatasetKey[]
}

interface GraphDataRequest {
  kind: 'graph-data'
  scenarioSpecL?: ScenarioSpec
  scenarioSpecR?: ScenarioSpec
  graphId: BundleGraphId
}

type DataRequest = DatasetRequest | GraphDataRequest

interface DatasetResponse {
  kind: 'dataset'
  datasetMapL?: DatasetMap
  datasetMapR?: DatasetMap
}

interface GraphDataResponse {
  kind: 'graph-data'
  graphDataL?: BundleGraphData
  graphDataR?: BundleGraphData
}

type DataResponse = DatasetResponse | GraphDataResponse

/**
 * Coordinates loading of data in parallel from two models.
 */
export class ComparisonDataCoordinator {
  private readonly taskQueue: TaskQueue<DataRequest, DataResponse>

  constructor(
    public readonly bundleModelL: BundleModel,
    public readonly bundleModelR: BundleModel
  ) {
    this.taskQueue = new TaskQueue({
      process: async request => {
        // Run the models in parallel
        switch (request.kind) {
          case 'dataset':
            return this.processDatasetRequest(request)
          case 'graph-data':
            return this.processGraphDataRequest(request)
          default:
            assertNever(request)
        }
      }
    })
  }

  private async processDatasetRequest(request: DatasetRequest): Promise<DatasetResponse> {
    // Helper function that fetches data from a particular model
    async function fetchDatasets(
      bundleModel: BundleModel,
      scenarioSpec: ScenarioSpec | undefined
    ): Promise<DatasetsResult> {
      if (scenarioSpec) {
        return bundleModel.getDatasetsForScenario(scenarioSpec, request.datasetKeys)
      } else {
        return undefined
      }
    }

    // Run the model(s) in parallel and extract the requested datasets
    const [resultL, resultR] = await Promise.all([
      fetchDatasets(this.bundleModelL, request.scenarioSpecL),
      fetchDatasets(this.bundleModelR, request.scenarioSpecR)
    ])

    return {
      kind: 'dataset',
      datasetMapL: resultL?.datasetMap,
      datasetMapR: resultR?.datasetMap
    }
  }

  private async processGraphDataRequest(request: GraphDataRequest): Promise<GraphDataResponse> {
    // Helper function that fetches data from a particular model
    async function fetchGraphData(
      bundleModel: BundleModel,
      scenarioSpec: ScenarioSpec | undefined
    ): Promise<BundleGraphData> {
      if (scenarioSpec) {
        return bundleModel.getGraphDataForScenario(scenarioSpec, request.graphId)
      } else {
        return undefined
      }
    }

    // Run the model(s) in parallel and extract the requested graph data
    const [graphDataL, graphDataR] = await Promise.all([
      fetchGraphData(this.bundleModelL, request.scenarioSpecL),
      fetchGraphData(this.bundleModelR, request.scenarioSpecR)
    ])

    return {
      kind: 'graph-data',
      graphDataL,
      graphDataR
    }
  }

  requestDatasetMaps(
    requestKey: ComparisonDataRequestKey,
    scenarioSpecL: ScenarioSpec,
    scenarioSpecR: ScenarioSpec,
    datasetKeys: DatasetKey[],
    onResponse: (datasetMapL?: DatasetMap, datasetMapR?: DatasetMap) => void
  ): void {
    const request: DatasetRequest = {
      kind: 'dataset',
      scenarioSpecL,
      scenarioSpecR,
      datasetKeys
    }
    this.taskQueue.addTask(requestKey, request, response => {
      if (response.kind === 'dataset') {
        onResponse(response.datasetMapL, response.datasetMapR)
      }
    })
  }

  requestGraphData(
    requestKey: ComparisonDataRequestKey,
    scenarioSpecL: ScenarioSpec,
    scenarioSpecR: ScenarioSpec,
    graphId: BundleGraphId,
    onResponse: (graphDataL?: BundleGraphData, graphDataR?: BundleGraphData) => void
  ): void {
    const request: GraphDataRequest = {
      kind: 'graph-data',
      scenarioSpecL,
      scenarioSpecR,
      graphId
    }
    this.taskQueue.addTask(requestKey, request, response => {
      if (response.kind === 'graph-data') {
        onResponse(response.graphDataL, response.graphDataR)
      }
    })
  }

  cancelRequest(key: ComparisonDataRequestKey): void {
    this.taskQueue.cancelTask(key)
  }
}
