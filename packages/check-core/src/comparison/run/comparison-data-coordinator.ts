// Copyright (c) 2021-2025 Climate Interactive / New Venture Fund

import type { DatasetsResult, GetDatasetsOptions } from '../../_shared/data-source'
import type { ConstantOverride, LookupOverride, ScenarioSpec } from '../../_shared/scenario-spec-types'
import type { Task } from '../../_shared/task-queue'
import { TaskQueue } from '../../_shared/task-queue'
import type { DatasetKey, DatasetMap } from '../../_shared/types'

import type { BundleModel, BundleGraphData, BundleGraphId } from '../../bundle/bundle-types'

export type ComparisonDataRequestKey = string

/**
 * Options for `requestDatasetMaps`.
 */
export interface RequestDatasetMapsOptions {
  /** Optional constant overrides for the "left" model. */
  constantsL?: ConstantOverride[]
  /** Optional constant overrides for the "right" model. */
  constantsR?: ConstantOverride[]
  /** Optional lookup overrides for the "left" model. */
  lookupsL?: LookupOverride[]
  /** Optional lookup overrides for the "right" model. */
  lookupsR?: LookupOverride[]
}

/**
 * Coordinates loading of data in parallel from two models.
 */
export class ComparisonDataCoordinator {
  constructor(private readonly taskQueue: TaskQueue) {}

  /**
   * Request datasets from the two models.
   *
   * @param requestKey The unique key for the request.
   * @param sourceL The source of the first ("left") dataset.  If "left", the datasets will
   * be fetched from the "left" bundle's model, otherwise they will be fetched from the
   * "right" bundle's model.
   * @param scenarioSpecL The scenario used for the first ("left") model of the comparison.
   * @param sourceR The source of the second ("right") dataset.  If "left", the datasets
   * will be fetched from the "left" bundle's model, otherwise they will be fetched from
   * the "right" bundle's model.
   * @param scenarioSpecR The scenario used for the second ("right") model of the comparison.
   * @param datasetKeys The keys of the datasets to be fetched.
   * @param options Optional configuration including constant and lookup overrides.
   * @param onResponse The callback that will be called with the dataset maps.
   */
  requestDatasetMaps(
    requestKey: ComparisonDataRequestKey,
    sourceL: 'left' | 'right',
    scenarioSpecL: ScenarioSpec,
    sourceR: 'left' | 'right',
    scenarioSpecR: ScenarioSpec,
    datasetKeys: DatasetKey[],
    options: RequestDatasetMapsOptions | undefined,
    onResponse: (datasetMapL?: DatasetMap, datasetMapR?: DatasetMap) => void
  ): void {
    // Helper function that fetches data from a particular model
    async function fetchDatasets(
      bundleModel: BundleModel,
      scenarioSpec: ScenarioSpec | undefined,
      constants: ConstantOverride[] | undefined,
      lookups: LookupOverride[] | undefined
    ): Promise<DatasetsResult> {
      if (scenarioSpec) {
        let getDatasetsOptions: GetDatasetsOptions | undefined
        if (constants || lookups) {
          getDatasetsOptions = { constants, lookups }
        }
        return bundleModel.getDatasetsForScenario(scenarioSpec, datasetKeys, getDatasetsOptions)
      } else {
        return undefined
      }
    }

    const task: Task = {
      key: requestKey,
      kind: 'comparison-data-coordinator',
      process: async bundleModels => {
        const modelL = sourceL === 'left' ? bundleModels.L : bundleModels.R
        const modelR = sourceR === 'left' ? bundleModels.L : bundleModels.R

        let resultL: DatasetsResult
        let resultR: DatasetsResult
        if (modelL === modelR) {
          // The models are the same, so we need to perform the two runs sequentially (since
          // currently a single model instance cannot be used concurrently)
          resultL = await fetchDatasets(modelL, scenarioSpecL, options?.constantsL, options?.lookupsL)
          resultR = await fetchDatasets(modelR, scenarioSpecR, options?.constantsR, options?.lookupsR)
        } else {
          // The models are different, so we can perform the two runs in parallel
          const results = await Promise.all([
            fetchDatasets(modelL, scenarioSpecL, options?.constantsL, options?.lookupsL),
            fetchDatasets(modelR, scenarioSpecR, options?.constantsR, options?.lookupsR)
          ])
          resultL = results[0]
          resultR = results[1]
        }

        onResponse(resultL?.datasetMap, resultR?.datasetMap)
      }
    }
    this.taskQueue.addTask(task)
  }

  /**
   * Request graph data from the two models.
   *
   * @param requestKey The unique key for the request.
   * @param sourceL The source of the first ("left") dataset.  If "left", the datasets will
   * be fetched from the "left" bundle's model, otherwise they will be fetched from the
   * "right" bundle's model.
   * @param scenarioSpecL The scenario used for the first ("left") model of the comparison.
   * @param sourceR The source of the second ("right") dataset.  If "left", the datasets
   * will be fetched from the "left" bundle's model, otherwise they will be fetched from
   * the "right" bundle's model.
   * @param scenarioSpecR The scenario used for the second ("right") model of the comparison.
   * @param graphId The ID of the graph for which data will be fetched.
   * @param onResponse The callback that will be called with the graph data.
   */
  requestGraphData(
    requestKey: ComparisonDataRequestKey,
    sourceL: 'left' | 'right',
    scenarioSpecL: ScenarioSpec,
    sourceR: 'left' | 'right',
    scenarioSpecR: ScenarioSpec,
    graphId: BundleGraphId,
    onResponse: (graphDataL?: BundleGraphData, graphDataR?: BundleGraphData) => void
  ): void {
    // Helper function that fetches data from a particular model
    async function fetchGraphData(
      bundleModel: BundleModel,
      scenarioSpec: ScenarioSpec | undefined
    ): Promise<BundleGraphData> {
      if (scenarioSpec) {
        return bundleModel.getGraphDataForScenario?.(scenarioSpec, graphId)
      } else {
        return undefined
      }
    }

    const task: Task = {
      key: requestKey,
      kind: 'comparison-data-coordinator',
      process: async bundleModels => {
        const modelL = sourceL === 'left' ? bundleModels.L : bundleModels.R
        const modelR = sourceR === 'left' ? bundleModels.L : bundleModels.R

        let graphDataL: BundleGraphData
        let graphDataR: BundleGraphData
        if (modelL === modelR) {
          // The models are the same, so we need to perform the two runs sequentially (since
          // currently a single model instance cannot be used concurrently)
          graphDataL = await fetchGraphData(modelL, scenarioSpecL)
          graphDataR = await fetchGraphData(modelR, scenarioSpecR)
        } else {
          // The models are different, so we can perform the two runs in parallel
          const results = await Promise.all([
            fetchGraphData(modelL, scenarioSpecL),
            fetchGraphData(modelR, scenarioSpecR)
          ])
          graphDataL = results[0]
          graphDataR = results[1]
        }

        onResponse(graphDataL, graphDataR)
      }
    }
    this.taskQueue.addTask(task)
  }

  cancelRequest(key: ComparisonDataRequestKey): void {
    this.taskQueue.cancelTask(key)
  }
}

export function createComparisonDataCoordinator(): ComparisonDataCoordinator {
  return new ComparisonDataCoordinator(TaskQueue.getInstance())
}
