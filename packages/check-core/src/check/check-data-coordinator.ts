// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import type { Task } from '../_shared/task-queue'
import { createExecutor, TaskQueue } from '../_shared/task-queue'
import type { Dataset, DatasetKey } from '../_shared/types'
import type { BundleModel } from '../bundle/bundle-types'

export type CheckDataRequestKey = string

/**
 * Coordinates on-demand loading of data used to display a graph representation
 * of a check/predicate.
 */
export class CheckDataCoordinator {
  constructor(private readonly taskQueue: TaskQueue) {}

  requestDataset(
    requestKey: CheckDataRequestKey,
    scenarioSpec: ScenarioSpec,
    datasetKey: DatasetKey,
    onResponse: (dataset: Dataset) => void
  ): void {
    const task: Task = {
      key: requestKey,
      kind: 'check-data-coordinator',
      process: async bundleModels => {
        // Run the model for this scenario
        const bundleModelR = bundleModels.R
        const result = await bundleModelR.getDatasetsForScenario(scenarioSpec, [datasetKey])
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
