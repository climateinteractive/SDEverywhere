// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { TaskQueue } from '../_shared/task-queue'
import { allInputsAtPositionSpec } from '../_shared/scenario-specs'

import type { BundleModel } from '../bundle/bundle-types'

import type { PerfReport } from './perf-stats'
import { PerfStats } from './perf-stats'

// The number of warmups for each perf run
const warmupCount = 5

// The number of times to run the model for each perf run
const runCount = 100

type PerfRequestKind = 'left' | 'right' | 'both'

interface PerfRequest {
  kind: PerfRequestKind
}

interface PerfResponse {
  runTimeL?: number
  runTimeR?: number
}

export class PerfRunner {
  private readonly taskQueue: TaskQueue<PerfRequest, PerfResponse>
  public onComplete?: (reportL: PerfReport, reportR: PerfReport) => void
  public onError?: (error: Error) => void

  constructor(
    public readonly bundleModelL: BundleModel,
    public readonly bundleModelR: BundleModel,
    private readonly mode: 'serial' | 'parallel' = 'serial'
  ) {
    const scenarioSpec = allInputsAtPositionSpec('at-default')

    this.taskQueue = new TaskQueue({
      process: async request => {
        switch (request.kind) {
          case 'left': {
            const result = await bundleModelL.getDatasetsForScenario(scenarioSpec, [])
            return {
              runTimeL: result.modelRunTime
            }
          }
          case 'right': {
            const result = await bundleModelR.getDatasetsForScenario(scenarioSpec, [])
            return {
              runTimeR: result.modelRunTime
            }
          }
          case 'both': {
            const [resultL, resultR] = await Promise.all([
              bundleModelL.getDatasetsForScenario(scenarioSpec, []),
              bundleModelR.getDatasetsForScenario(scenarioSpec, [])
            ])
            return {
              runTimeL: resultL.modelRunTime,
              runTimeR: resultR.modelRunTime
            }
          }
          default:
            assertNever(request.kind)
        }
      }
    })
  }

  start(): void {
    const statsL = new PerfStats()
    const statsR = new PerfStats()
    this.taskQueue.onIdle = error => {
      if (error) {
        this.onError(error)
      } else {
        this.onComplete?.(statsL.toReport(), statsR.toReport())
      }
    }

    const taskQueue = this.taskQueue
    function addTask(index: number, warmup: boolean, kind: PerfRequestKind) {
      const key = `${warmup ? 'warmup-' : ''}${kind}-${index}`
      const request: PerfRequest = {
        kind
      }
      taskQueue.addTask(key, request, response => {
        if (!warmup && response.runTimeL !== undefined) {
          statsL.addRun(response.runTimeL)
        }
        if (!warmup && response.runTimeR !== undefined) {
          statsR.addRun(response.runTimeR)
        }
      })
    }
    function addTasks(kind: PerfRequestKind) {
      for (let i = 0; i < warmupCount; i++) {
        addTask(i, true, kind)
      }
      for (let i = 0; i < runCount; i++) {
        addTask(i, false, kind)
      }
    }

    if (this.mode === 'parallel') {
      addTasks('both')
    } else {
      addTasks('left')
      addTasks('right')
    }
  }
}
