// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { allInputsAtPositionSpec } from '../_shared/scenario-specs'
import type { Task, TaskKey } from '../_shared/task-queue'
import { TaskQueue } from '../_shared/task-queue'

import type { PerfReport } from './perf-stats'
import { PerfStats } from './perf-stats'

export type CancelRunPerf = () => void

export interface RunPerfCallbacks {
  onComplete?: (reportL: PerfReport, reportR: PerfReport) => void
  onError?: (error: Error) => void
}

export interface RunPerfOptions {
  /** The mode to run the performance tests (default is 'serial'). */
  mode?: 'serial' | 'parallel'

  /** The number of warmups for each perf run (default is 5). */
  warmupCount?: number

  /** The number of times to run the model for each perf run (default is 100). */
  runCount?: number
}

/**
 * Perform a performance run with the given `TaskQueue` instance.
 *
 * @param taskQueue The task queue to use.
 * @param callbacks The callbacks that will be notified.
 * @param options The options for the performance run.
 * @return A function that will cancel the process when invoked.
 *
 * @hidden This is exported only for use in tests.
 */
export function runPerfWithTaskQueue(
  taskQueue: TaskQueue,
  callbacks: RunPerfCallbacks,
  options?: RunPerfOptions
): CancelRunPerf {
  const perfRunner = new PerfRunner(taskQueue, callbacks, options)
  perfRunner.start()
  return () => {
    perfRunner.cancel()
  }
}

/**
 * Run performance tests on the bundle models.
 *
 * @param callbacks The callbacks that will be notified.
 * @param options The options for the performance run.
 * @return A function that will cancel the process when invoked.
 */
export function runPerf(callbacks: RunPerfCallbacks, options?: RunPerfOptions): CancelRunPerf {
  const taskQueue = TaskQueue.getInstance()
  return runPerfWithTaskQueue(taskQueue, callbacks, options)
}

type PerfRequestKind = 'left' | 'right' | 'both'

class PerfRunner {
  private readonly pendingTaskKeys: Set<TaskKey> = new Set()
  private stopped = false

  constructor(
    private readonly taskQueue: TaskQueue,
    private readonly callbacks: RunPerfCallbacks,
    private readonly options?: RunPerfOptions
  ) {}

  cancel(): void {
    if (!this.stopped) {
      for (const taskKey of this.pendingTaskKeys) {
        this.taskQueue.cancelTask(taskKey)
      }
      this.stopped = true
    }
  }

  start(): void {
    // Initialize the performance stats
    const statsL = new PerfStats()
    const statsR = new PerfStats()

    // Always use the "all inputs at default" scenario
    const scenarioSpec = allInputsAtPositionSpec('at-default')

    // Get the warmup and run counts
    const warmupCount = this.options?.warmupCount ?? 5
    const runCount = this.options?.runCount ?? 100

    // Calculate total number of tasks
    let totalTasks = 0
    if (this.options?.mode === 'parallel') {
      totalTasks = warmupCount + runCount
    } else {
      totalTasks = (warmupCount + runCount) * 2
    }

    let tasksCompleted = 0
    let perfTaskId = 1
    const addTask = (warmup: boolean, kind: PerfRequestKind) => {
      const task: Task = {
        key: `perf-runner-${perfTaskId++}`,
        kind: 'perf-runner',
        process: async bundleModels => {
          // Remove the task key from the set of pending task keys
          this.pendingTaskKeys.delete(task.key)

          try {
            let runTimeL: number | undefined
            let runTimeR: number | undefined

            switch (kind) {
              case 'left': {
                const result = await bundleModels.L.getDatasetsForScenario(scenarioSpec, [])
                runTimeL = result.modelRunTime
                break
              }
              case 'right': {
                const result = await bundleModels.R.getDatasetsForScenario(scenarioSpec, [])
                runTimeR = result.modelRunTime
                break
              }
              case 'both': {
                const [resultL, resultR] = await Promise.all([
                  bundleModels.L.getDatasetsForScenario(scenarioSpec, []),
                  bundleModels.R.getDatasetsForScenario(scenarioSpec, [])
                ])
                runTimeL = resultL.modelRunTime
                runTimeR = resultR.modelRunTime
                break
              }
              default:
                assertNever(kind)
            }

            // Add to stats if not warmup
            if (!warmup) {
              if (runTimeL !== undefined) {
                statsL.addRun(runTimeL)
              }
              if (runTimeR !== undefined) {
                statsR.addRun(runTimeR)
              }
            }

            // Notify the completion callback when all tasks have been processed
            tasksCompleted++
            if (tasksCompleted === totalTasks) {
              this.callbacks.onComplete?.(statsL.toReport(), statsR.toReport())
            }
          } catch (error) {
            this.callbacks.onError?.(error)
          }
        }
      }
      this.taskQueue.addTask(task)
      this.pendingTaskKeys.add(task.key)
    }

    function addTasks(kind: PerfRequestKind) {
      for (let i = 0; i < warmupCount; i++) {
        addTask(true, kind)
      }
      for (let i = 0; i < runCount; i++) {
        addTask(false, kind)
      }
    }

    if (this.options?.mode === 'parallel') {
      addTasks('both')
    } else {
      addTasks('left')
      addTasks('right')
    }
  }
}
