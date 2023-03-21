// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetsResult } from '../_shared/data-source'
import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import { TaskQueue } from '../_shared/task-queue'
import type { DatasetKey } from '../_shared/types'

import type { BundleModel } from '../bundle/bundle-types'

import type { DataRequest } from '../data/data-planner'
import { DataPlanner } from '../data/data-planner'

import { parseTestYaml } from '../check/check-parser'
import { runChecks } from '../check/check-runner'

import { runComparisons } from '../comparison/run/comparison-runner'
import type { ComparisonReport, ComparisonTestReport } from '../comparison/report/comparison-report-types'

import type { Config } from '../config/config-types'

import { PerfStats } from '../perf/perf-stats'

import type { SuiteReport } from './suite-report-types'

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
    let buildComparisonTestReports: () => ComparisonTestReport[]
    if (this.config.comparison) {
      buildComparisonTestReports = runComparisons(this.config.comparison, dataPlanner, simplifyScenarios)
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
        let comparisonReport: ComparisonReport
        if (this.config.comparison) {
          comparisonReport = {
            testReports: buildComparisonTestReports(),
            perfReportL: this.perfStatsL.toReport(),
            perfReportR: this.perfStatsR.toReport()
          }
        }
        this.callbacks.onComplete?.({
          checkReport,
          comparisonReport
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
      let comparisonReport: ComparisonReport
      if (this.config.comparison) {
        comparisonReport = {
          testReports: [],
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
        comparisonReport
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

    async function getDatasets(
      bundleModel: BundleModel | undefined,
      scenarioSpec: ScenarioSpec | undefined
    ): Promise<DatasetsResult> {
      if (bundleModel && scenarioSpec) {
        return bundleModel.getDatasetsForScenario(scenarioSpec, datasetKeys)
      } else {
        return undefined
      }
    }

    // Run the model(s) in parallel and extract the requested datasets
    const bundleModelL = this.config.comparison?.bundleL.model
    const bundleModelR = this.config.comparison?.bundleR.model || this.config.check.bundle.model
    const [datasetsResultL, datasetsResultR] = await Promise.all([
      getDatasets(bundleModelL, request.scenarioSpecL),
      getDatasets(bundleModelR, request.scenarioSpecR)
    ])

    // Update the performance stats
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
      dataTask.dataAction({
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
