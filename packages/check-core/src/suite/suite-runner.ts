// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import { TaskQueue } from '../_shared/task-queue'
import type { DatasetKey } from '../_shared/types'

import type { DataRequest } from '../data/data-planner'
import { DataPlanner } from '../data/data-planner'

import { parseTestYaml } from '../check/check-parser'
import { runChecks } from '../check/check-runner'

import type { CompareDatasetReport, CompareReport } from '../compare/compare-report'
import { runCompare } from '../compare/compare-runner'

import type { Config } from '../config/config-types'

import { PerfStats } from '../perf/perf-stats'

import type { SuiteReport } from './suite-report'
import type { DatasetsResult } from '../_shared/data-source'

export type CancelRunSuite = () => void

export interface RunSuiteCallbacks {
  onProgress?: (pct: number) => void
  onComplete?: (suiteReport: SuiteReport) => void
  onError?: (error: Error) => void
}

export interface RunSuiteOptions {
  /** Set to true to reduce the number of scenarios generated for a `matrix`. */
  simplifyScenarios?: boolean
}

/**
 * Coordinates running the full suite of checks and comparisons defined in the
 * configuration.  This plans out the data fetches in advance so that the minimal
 * set of model runs are performed.  For example, if the same scenario is needed
 * for both a check and a comparison, we only need to run the model(s) once for
 * that scenario.
 */
class SuiteRunner {
  private readonly taskQueue: TaskQueue<DataRequest, void>
  private readonly perfStatsL: PerfStats = new PerfStats()
  private readonly perfStatsR: PerfStats = new PerfStats()
  private stopped = false

  constructor(private readonly config: Config, private readonly callbacks: RunSuiteCallbacks) {
    this.taskQueue = new TaskQueue({
      process: request => {
        return this.processRequest(request)
      }
    })
  }

  cancel(): void {
    if (!this.stopped) {
      this.stopped = true
      this.taskQueue.shutdown()
    }
  }

  start(options?: RunSuiteOptions): void {
    // Send the initial progress update
    this.callbacks.onProgress?.(0)

    // Create a data planner to map out the model runs that are needed to
    // efficiently fetch the data to perform both the checks and comparisons
    const modelSpec = this.config.check.bundle.model.modelSpec
    const dataPlanner = new DataPlanner(modelSpec.outputVars.size)

    // Create a separate data planner for ref data; these datasets will be
    // fetched first and kept in memory so that they can be accessed by any
    // checks/predicates that reference them
    const refDataPlanner = new DataPlanner(modelSpec.outputVars.size)

    // Parse the check tests
    const checkSpecResult = parseTestYaml(this.config.check.tests)
    if (checkSpecResult.isErr()) {
      this.callbacks.onError?.(checkSpecResult.error)
      return
    }
    const checkSpec = checkSpecResult.value

    // Plan the checks
    const simplifyScenarios = options?.simplifyScenarios === true
    const buildCheckReport = runChecks(this.config.check, checkSpec, dataPlanner, refDataPlanner, simplifyScenarios)

    // Plan the comparisons, if configured
    let buildCompareDatasetReports: () => CompareDatasetReport[]
    if (this.config.compare) {
      buildCompareDatasetReports = runCompare(this.config.compare, dataPlanner, simplifyScenarios)
    }

    // When all tasks have been processed, build the report
    this.taskQueue.onIdle = error => {
      if (this.stopped) {
        return
      }

      if (error) {
        this.callbacks.onError?.(error)
      } else {
        const checkReport = buildCheckReport()
        let compareReport: CompareReport
        if (this.config.compare) {
          compareReport = {
            datasetReports: buildCompareDatasetReports(),
            perfReportL: this.perfStatsL.toReport(),
            perfReportR: this.perfStatsR.toReport()
          }
        }
        this.callbacks.onComplete?.({
          checkReport,
          compareReport
        })
      }
    }

    // Plan the data tasks.  The ref data tasks must be processed first so that
    // the reference data is available in memory when checks are performed.
    const refDataPlan = refDataPlanner.buildPlan()
    const dataPlan = dataPlanner.buildPlan()
    const dataRequests = [...refDataPlan.requests, ...dataPlan.requests]
    const taskCount = dataRequests.length
    if (taskCount === 0) {
      // There are no checks or comparison tests; notify completion callback
      // with empty reports
      let compareReport: CompareReport
      if (this.config.compare) {
        compareReport = {
          datasetReports: [],
          perfReportL: this.perfStatsL.toReport(),
          perfReportR: this.perfStatsR.toReport()
        }
      }
      this.cancel()
      this.callbacks.onProgress?.(1)
      this.callbacks.onComplete?.({
        checkReport: {
          groups: []
        },
        compareReport
      })
      return
    }

    // Schedule a task for each data request
    let tasksCompleted = 0
    let dataTaskId = 1
    for (const dataRequest of dataRequests) {
      this.taskQueue.addTask(`data${dataTaskId++}`, dataRequest, () => {
        // Notify the progress callback after each task is processed
        tasksCompleted++
        this.callbacks.onProgress?.(tasksCompleted / taskCount)
      })
    }
  }

  private async processRequest(request: DataRequest): Promise<void> {
    // Get the set of dataset keys requested for this run
    const datasetKeySet: Set<DatasetKey> = new Set()
    for (const dataTask of request.dataTasks) {
      datasetKeySet.add(dataTask.datasetKey)
    }
    const datasetKeys = [...datasetKeySet]

    // Run the model(s) and extract the requested datasets
    const scenario = request.scenario
    let datasetsResultL: DatasetsResult
    let datasetsResultR: DatasetsResult
    switch (request.kind) {
      case 'check': {
        // Run the "current" model only
        const bundleModel = this.config.check.bundle.model
        datasetsResultR = await bundleModel.getDatasetsForScenario(scenario, datasetKeys)
        break
      }
      case 'compare': {
        // Run both the "baseline" and "current" models
        const bundleModelL = this.config.compare.bundleL.model
        const bundleModelR = this.config.compare.bundleR.model
        const [resultL, resultR] = await Promise.all([
          bundleModelL.getDatasetsForScenario(scenario, datasetKeys),
          bundleModelR.getDatasetsForScenario(scenario, datasetKeys)
        ])
        datasetsResultL = resultL
        datasetsResultR = resultR
        break
      }
      default:
        assertNever(request.kind)
    }

    // Update the performance stats (only for 'compare' requests)
    if (datasetsResultL?.modelRunTime) {
      this.perfStatsL.addRun(datasetsResultL?.modelRunTime)
    }
    if (datasetsResultR?.modelRunTime) {
      this.perfStatsR.addRun(datasetsResultR?.modelRunTime)
    }

    // Perform the requested action on the dataset(s)
    const datasetMapL = datasetsResultL?.datasetMap
    const datasetMapR = datasetsResultR?.datasetMap
    for (const dataTask of request.dataTasks) {
      const datasetL = datasetMapL?.get(dataTask.datasetKey)
      const datasetR = datasetMapR?.get(dataTask.datasetKey)
      dataTask.dataFunc({
        datasetL,
        datasetR
      })
    }
  }
}

/**
 * Run the full suite of checks and comparisons defined in the given configuration.
 *
 * @param config The test suite configuration.
 * @param callbacks The callbacks that will be notified.
 * @param options Options to control how the tests are run.
 * @return A function that will cancel the process when invoked.
 */
export function runSuite(config: Config, callbacks: RunSuiteCallbacks, options?: RunSuiteOptions): CancelRunSuite {
  const suiteRunner = new SuiteRunner(config, callbacks)
  suiteRunner.start(options)
  return () => {
    suiteRunner.cancel()
  }
}
