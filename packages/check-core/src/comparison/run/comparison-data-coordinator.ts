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
  /**
   * The source of the first ("left") dataset.  If "left", the datasets will be fetched from the "left"
   * model passed to the constructor, otherwise they will be fetched from the "right" model.
   */
  sourceL: 'left' | 'right'
  /** The scenario used for the first ("left") model of the comparison. */
  scenarioSpecL?: ScenarioSpec
  /**
   * The source of the second ("right") dataset.  If "left", the datasets will be fetched from the "left"
   * model passed to the constructor, otherwise they will be fetched from the "right" model.
   */
  sourceR: 'left' | 'right'
  /** The scenario used for the second ("right") model of the comparison. */
  scenarioSpecR?: ScenarioSpec
  /** The keys of the datasets to be fetched. */
  datasetKeys: DatasetKey[]
}

interface GraphDataRequest {
  kind: 'graph-data'
  /**
   * The source of the first ("left") dataset.  If "left", the datasets will be fetched from the "left"
   * model passed to the constructor, otherwise they will be fetched from the "right" model.
   */
  sourceL: 'left' | 'right'
  /** The scenario used for the first ("left") model of the comparison. */
  scenarioSpecL?: ScenarioSpec
  /**
   * The source of the second ("right") dataset.  If "left", the datasets will be fetched from the "left"
   * model passed to the constructor, otherwise they will be fetched from the "right" model.
   */
  sourceR: 'left' | 'right'
  /** The scenario used for the second ("right") model of the comparison. */
  scenarioSpecR?: ScenarioSpec
  /** The ID of the graph for which data will be fetched. */
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

  constructor(public readonly bundleModelL: BundleModel, public readonly bundleModelR: BundleModel) {
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

    const modelL = request.sourceL === 'left' ? this.bundleModelL : this.bundleModelR
    const modelR = request.sourceR === 'left' ? this.bundleModelL : this.bundleModelR
    let resultL: DatasetsResult
    let resultR: DatasetsResult
    if (modelL === modelR) {
      // The models are the same, so we need to perform the two runs sequentially (since
      // currently a single model instance cannot be used concurrently)
      resultL = await fetchDatasets(modelL, request.scenarioSpecL)
      resultR = await fetchDatasets(modelR, request.scenarioSpecR)
    } else {
      // The models are different, so we can perform the two runs in parallel
      const results = await Promise.all([
        fetchDatasets(modelL, request.scenarioSpecL),
        fetchDatasets(modelR, request.scenarioSpecR)
      ])
      resultL = results[0]
      resultR = results[1]
    }

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

    const modelL = request.sourceL === 'left' ? this.bundleModelL : this.bundleModelR
    const modelR = request.sourceR === 'left' ? this.bundleModelL : this.bundleModelR
    let graphDataL: BundleGraphData
    let graphDataR: BundleGraphData
    if (modelL === modelR) {
      // The models are the same, so we need to perform the two runs sequentially (since
      // currently a single model instance cannot be used concurrently)
      graphDataL = await fetchGraphData(modelL, request.scenarioSpecL)
      graphDataR = await fetchGraphData(modelR, request.scenarioSpecR)
    } else {
      // The models are different, so we can perform the two runs in parallel
      const results = await Promise.all([
        fetchGraphData(modelL, request.scenarioSpecL),
        fetchGraphData(modelR, request.scenarioSpecR)
      ])
      graphDataL = results[0]
      graphDataR = results[1]
    }

    return {
      kind: 'graph-data',
      graphDataL,
      graphDataR
    }
  }

  requestDatasetMaps(
    requestKey: ComparisonDataRequestKey,
    sourceL: 'left' | 'right',
    scenarioSpecL: ScenarioSpec,
    sourceR: 'left' | 'right',
    scenarioSpecR: ScenarioSpec,
    datasetKeys: DatasetKey[],
    onResponse: (datasetMapL?: DatasetMap, datasetMapR?: DatasetMap) => void
  ): void {
    const request: DatasetRequest = {
      kind: 'dataset',
      sourceL,
      scenarioSpecL,
      sourceR,
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
    sourceL: 'left' | 'right',
    scenarioSpecL: ScenarioSpec,
    sourceR: 'left' | 'right',
    scenarioSpecR: ScenarioSpec,
    graphId: BundleGraphId,
    onResponse: (graphDataL?: BundleGraphData, graphDataR?: BundleGraphData) => void
  ): void {
    const request: GraphDataRequest = {
      kind: 'graph-data',
      sourceL,
      scenarioSpecL,
      sourceR,
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
