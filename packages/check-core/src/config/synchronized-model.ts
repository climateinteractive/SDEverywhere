// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { BundleGraphId, BundleModel } from '../bundle/bundle-types'
import type { Scenario } from '../_shared/scenario'
import type { DatasetKey } from '../_shared/types'

/**
 * Wrap the given `BundleModel` in a new `BundleModel` that synchronizes
 * (i.e., single-tracks) the wrapped model so that only one call to
 * `getDatasetsForScenario` can be made at a time.
 *
 * This is a convenience for models that use an asynchronous model runner
 * but only allow for one model run at a time.  In most cases, we use
 * a `TaskQueue` to serialize requests, but due to the fact that we allow
 * for cancellation of e.g. `runSuite`, it's possible that we may try to
 * start a new `runSuite` before the previous model runs had a chance
 * to complete.
 *
 * TODO: This is a heavy-handed approach and may not be appropriate for
 * all model types (it is mainly designed for SDEverywhere-generated models
 * that use the `sde-model-async` package).  It might be better to instead
 * revisit the design of the `SuiteRunner`, `DataCoordinator`, etc classes.
 *
 * @param sourceModel The underlying bundle model.
 */
export function synchronizedBundleModel(sourceModel: BundleModel): BundleModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promiseQueue: PromiseQueue<any> = new PromiseQueue()

  return {
    modelSpec: sourceModel.modelSpec,
    getDatasetsForScenario: (scenario: Scenario, datasetKeys: DatasetKey[]) => {
      return promiseQueue.add(() => sourceModel.getDatasetsForScenario(scenario, datasetKeys))
    },
    getGraphsForDataset: sourceModel.getGraphsForDataset?.bind(sourceModel),
    getGraphDataForScenario: (scenario: Scenario, graphId: BundleGraphId) => {
      return promiseQueue.add(() => sourceModel.getGraphDataForScenario(scenario, graphId))
    },
    getGraphLinksForScenario: sourceModel.getGraphLinksForScenario.bind(sourceModel)
  }
}

type PromiseFunc<T> = () => Promise<T>

/**
 * Quick and dirty promise queue that supports running at most one operation
 * at a time.
 */
class PromiseQueue<T> {
  private readonly tasks: PromiseFunc<void>[] = []
  private runningCount = 0

  add(f: PromiseFunc<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async (): Promise<void> => {
        this.runningCount++

        const promise = f()
        try {
          const result = await promise
          resolve(result)
        } catch (e) {
          reject(e)
        } finally {
          this.runningCount--
          this.runNext()
        }
      }

      if (this.runningCount < 1) {
        run()
      } else {
        this.tasks.push(run)
      }
    })
  }

  private runNext(): void {
    if (this.tasks.length > 0) {
      const task = this.tasks.shift()
      if (task) {
        task()
      }
    }
  }
}
