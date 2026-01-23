// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { GetDatasetsOptions } from '../_shared/data-source'
import type { ConstantOverride, ScenarioSpec } from '../_shared/scenario-spec-types'
import type { Task } from '../_shared/task-queue'
import { createExecutor, TaskQueue } from '../_shared/task-queue'
import type { Dataset, DatasetKey } from '../_shared/types'
import type { BundleModel } from '../bundle/bundle-types'

export type CheckDataRequestKey = string

/**
 * Options for `requestDataset`.
 */
export interface RequestDatasetOptions {
  /** Optional constant overrides for the model. */
  constants?: ConstantOverride[]
}

/**
 * Coordinates on-demand loading of data used to display a graph representation
 * of a check/predicate.
 */
export class CheckDataCoordinator {
  constructor(private readonly taskQueue: TaskQueue) {}

  /**
   * Request a dataset from the model.
   *
   * @param requestKey The unique key for the request.
   * @param scenarioSpec The scenario spec that defines the inputs for the model run.
   * @param datasetKey The key of the dataset to be fetched.
   * @param options Optional configuration including constant overrides.
   * @param onResponse The callback that will be called with the dataset.
   */
  requestDataset(
    requestKey: CheckDataRequestKey,
    scenarioSpec: ScenarioSpec,
    datasetKey: DatasetKey,
    options: RequestDatasetOptions | undefined,
    onResponse: (dataset: Dataset) => void
  ): void {
    const task: Task = {
      key: requestKey,
      kind: 'check-data-coordinator',
      process: async bundleModels => {
        // Run the model for this scenario
        const bundleModelR = bundleModels.R
        const getDatasetsOptions: GetDatasetsOptions | undefined = options?.constants
          ? { constants: options.constants }
          : undefined
        const result = await bundleModelR.getDatasetsForScenario(scenarioSpec, [datasetKey], getDatasetsOptions)
        const dataset = result.datasetMap.get(datasetKey)
        onResponse(dataset)
      }
    }
    this.taskQueue.addTask(task)
  }

  cancelRequest(key: CheckDataRequestKey): void {
    this.taskQueue.cancelTask(key)
  }
}

/**
 * Create a `CheckDataCoordinator` instance using the shared task queue.
 */
export function createCheckDataCoordinator(): CheckDataCoordinator {
  return new CheckDataCoordinator(TaskQueue.getInstance())
}

/**
 * @hidden This is not part of the public API; it is exposed only for use in tests.
 */
export function createCheckDataCoordinatorForTests(bundleModel: BundleModel): CheckDataCoordinator {
  // Initialize the shared task queue with a single executor for testing purposes
  const executor = createExecutor(undefined, bundleModel)
  const taskQueue = new TaskQueue(new Map([['test-executor-0', executor]]))
  return new CheckDataCoordinator(taskQueue)
}
