// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { DatasetsResult } from '../_shared/data-source'
import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import type { BundleModels, Task, TaskKey } from '../_shared/task-queue2'
import { TaskQueue } from '../_shared/task-queue2'
import type { Dataset, DatasetKey, DatasetMap } from '../_shared/types'

import type { ModelSpec } from '../bundle/bundle-types'

import type { DiffPoint, DiffValidity } from '../comparison/diff-datasets/diff-datasets'

import type { TraceDatasetReport, TraceReport } from './trace-report'

export type CancelRunTrace = () => void

export interface RunTraceCallbacks {
  onComplete?: (traceReport: TraceReport) => void
  onError?: (error: Error) => void
}

export interface TraceCompareToBundleOptions {
  kind: 'compare-to-bundle'
  bundleSide0: 'left' | 'right'
  scenarioSpec0: ScenarioSpec
  bundleSide1: 'left' | 'right'
  scenarioSpec1: ScenarioSpec
}

export interface TraceCompareToExtDataOptions {
  kind: 'compare-to-ext-data'
  extData: DatasetMap
  bundleSide: 'left' | 'right'
  scenarioSpec: ScenarioSpec
}

export type TraceOptions = TraceCompareToBundleOptions | TraceCompareToExtDataOptions

/**
 * Perform a trace run with the given `TaskQueue` instance.
 *
 * @param modelSpec The model spec that provides the datasets to be compared (usually from the "right" bundle).
 * @param taskQueue The task queue to use.
 * @param callbacks The callbacks that will be notified.
 * @param options Options to control how the trace is run.
 * @return A function that will cancel the process when invoked.
 *
 * @hidden This is exported only for use in tests.
 */
export function runTraceWithTaskQueue(
  modelSpec: ModelSpec,
  taskQueue: TaskQueue,
  callbacks: RunTraceCallbacks,
  options: TraceOptions
): CancelRunTrace {
  const traceRunner = new TraceRunner(taskQueue, callbacks)
  traceRunner.start(modelSpec, options)
  return () => {
    traceRunner.cancel()
  }
}

/**
 * Perform a trace run, comparing all datasets from the requested models.
 *
 * @param modelSpec The model spec that provides the datasets to be compared (usually from the "right" bundle).
 * @param callbacks The callbacks that will be notified.
 * @param options Options to control how the trace is run.
 * @return A function that will cancel the process when invoked.
 */
export function runTrace(modelSpec: ModelSpec, callbacks: RunTraceCallbacks, options: TraceOptions): CancelRunTrace {
  const taskQueue = TaskQueue.getInstance()
  return runTraceWithTaskQueue(modelSpec, taskQueue, callbacks, options)
}

interface CompareToBundleRequest {
  kind: 'compare-to-bundle'
  datasetKeys: DatasetKey[]
  bundleSide0: 'left' | 'right'
  scenarioSpec0: ScenarioSpec
  bundleSide1: 'left' | 'right'
  scenarioSpec1: ScenarioSpec
}

interface CompareToExtDataRequest {
  kind: 'compare-to-ext-data'
  datasetKeys: DatasetKey[]
  extData: DatasetMap
  bundleSide: 'left' | 'right'
  scenarioSpec: ScenarioSpec
}

type TraceRequest = CompareToBundleRequest | CompareToExtDataRequest

class TraceRunner {
  private readonly pendingTaskKeys: Set<TaskKey> = new Set()
  private stopped = false

  constructor(
    private readonly taskQueue: TaskQueue,
    private readonly callbacks: RunTraceCallbacks
  ) {}

  cancel(): void {
    if (!this.stopped) {
      for (const taskKey of this.pendingTaskKeys) {
        this.taskQueue.cancelTask(taskKey)
      }
      this.stopped = true
    }
  }

  start(modelSpec: ModelSpec, options: TraceOptions): void {
    // Get the set of all dataset keys (as reported by the given model spec, usually the "right" one)
    const allDatasetKeys: DatasetKey[] = [...modelSpec.implVars.keys()]

    // Break the dataset requests into batches, with up to `batchSize` variables
    // in each batch
    const traceRequests: TraceRequest[] = []
    const batchSize = 2000
    for (let i = 0; i < allDatasetKeys.length; i += batchSize) {
      const datasetKeysForBatch = allDatasetKeys.slice(i, i + batchSize)
      switch (options.kind) {
        case 'compare-to-bundle':
          traceRequests.push({
            kind: 'compare-to-bundle',
            datasetKeys: datasetKeysForBatch,
            bundleSide0: options.bundleSide0,
            scenarioSpec0: options.scenarioSpec0,
            bundleSide1: options.bundleSide1,
            scenarioSpec1: options.scenarioSpec1
          })
          break
        case 'compare-to-ext-data':
          traceRequests.push({
            kind: 'compare-to-ext-data',
            datasetKeys: datasetKeysForBatch,
            extData: options.extData,
            bundleSide: options.bundleSide,
            scenarioSpec: options.scenarioSpec
          })
          break
        default:
          assertNever(options)
      }
    }

    // Gather all dataset reports into a single map
    const allDatasetReports: Map<DatasetKey, TraceDatasetReport> = new Map()

    // Schedule a task for each request
    const taskCount = traceRequests.length
    let tasksCompleted = 0
    let traceTaskId = 1
    for (const traceRequest of traceRequests) {
      const task: Task = {
        key: `trace-runner-${traceTaskId++}`,
        kind: 'trace-runner',
        process: async bundleModels => {
          // Remove the task key from the set of pending task keys
          this.pendingTaskKeys.delete(task.key)

          // Process the request
          let datasetReports: TraceDatasetReport[]
          switch (traceRequest.kind) {
            case 'compare-to-bundle':
              datasetReports = await processCompareToBundleRequest(traceRequest, bundleModels)
              break
            case 'compare-to-ext-data':
              datasetReports = await processCompareToExtDataRequest(traceRequest, bundleModels)
              break
            default:
              assertNever(traceRequest)
          }

          // Add the dataset comparison reports to the rollup map
          for (const datasetReport of datasetReports) {
            allDatasetReports.set(datasetReport.datasetKey, datasetReport)
          }

          // Notify the completion callback when all tasks have been processed
          tasksCompleted++
          if (tasksCompleted === taskCount) {
            const traceReport: TraceReport = {
              datasetReports: allDatasetReports
            }
            this.callbacks.onComplete?.(traceReport)
          }
        }
      }
      this.taskQueue.addTask(task)
      this.pendingTaskKeys.add(task.key)
    }
  }
}

async function processCompareToBundleRequest(
  request: CompareToBundleRequest,
  bundleModels: BundleModels
): Promise<TraceDatasetReport[]> {
  const bundleModel0 = request.bundleSide0 === 'left' ? bundleModels.L : bundleModels.R
  const bundleModel1 = request.bundleSide1 === 'left' ? bundleModels.L : bundleModels.R

  // Request the datasets from the bundle models
  let result0: DatasetsResult
  let result1: DatasetsResult
  if (bundleModel1 === bundleModel0) {
    // The bundles being compared are the same, so we need to run the model
    // for the two scenarios sequentially
    result0 = await bundleModel0.getDatasetsForScenario(request.scenarioSpec0, request.datasetKeys)
    result1 = await bundleModel1.getDatasetsForScenario(request.scenarioSpec1, request.datasetKeys)
  } else {
    // The bundles being compared are different, so we can run the model
    // for the two scenarios in parallel
    ;[result0, result1] = await Promise.all([
      bundleModel0.getDatasetsForScenario(request.scenarioSpec0, request.datasetKeys),
      bundleModel1.getDatasetsForScenario(request.scenarioSpec1, request.datasetKeys)
    ])
  }

  // Compare the datasets
  const datasetReports: TraceDatasetReport[] = []
  for (const datasetKey of request.datasetKeys) {
    const dataset0 = result0.datasetMap.get(datasetKey)
    const dataset1 = result1.datasetMap.get(datasetKey)
    const datasetReport = diffDatasets(datasetKey, dataset0, dataset1, /*matchPrecisionOfLeft=*/ false)
    datasetReports.push(datasetReport)
  }

  return datasetReports
}

async function processCompareToExtDataRequest(
  request: CompareToExtDataRequest,
  bundleModels: BundleModels
): Promise<TraceDatasetReport[]> {
  const bundleModel = request.bundleSide === 'left' ? bundleModels.L : bundleModels.R

  // Request the datasets from the bundle model
  const resultR = await bundleModel.getDatasetsForScenario(request.scenarioSpec, request.datasetKeys)

  // Compare the datasets to the external data
  const datasetReports: TraceDatasetReport[] = []
  for (const datasetKey of request.datasetKeys) {
    let datasetL = request.extData.get(datasetKey)
    if (datasetL === undefined) {
      // The dat file can have the subscripts in a different order than the normalized ones
      // used by SDE, we try the other possible permutations
      const datasetKeyParts = datasetKey.split('[')
      if (datasetKeyParts.length === 2) {
        const baseKey = datasetKeyParts[0]
        const keySubParts = datasetKeyParts[1].replace(']', '')
        const keySubIds = keySubParts.split(',')
        const subIdPermutations = permutationsOf(keySubIds)
        for (const subIds of subIdPermutations) {
          const datDatasetKey = `${baseKey}[${subIds.join(',')}]`
          datasetL = request.extData.get(datDatasetKey)
          if (datasetL !== undefined) {
            break
          }
        }
      }
      if (datasetL === undefined) {
        console.warn(`WARNING: Failed to find data in dat file for key=${datasetKey}`)
      }
    }
    const datasetR = resultR.datasetMap.get(datasetKey)
    const datasetReport = diffDatasets(datasetKey, datasetL, datasetR, /*matchPrecisionOfLeft=*/ true)
    datasetReports.push(datasetReport)
  }

  return datasetReports
}

// TODO: This is basically the same as the the other `diffDatasets` implementation except
// that this one preserves the diff details for every point in time
function diffDatasets(
  datasetKey: DatasetKey,
  datasetL: Dataset | undefined,
  datasetR: Dataset | undefined,
  matchPrecisionOfLeft: boolean
): TraceDatasetReport {
  const points: Map<number, DiffPoint> = new Map()
  let minValueL = Number.MAX_VALUE
  let maxValueL = Number.MIN_VALUE
  let minValueR = Number.MAX_VALUE
  let maxValueR = Number.MIN_VALUE
  let minValue = Number.MAX_VALUE
  let maxValue = Number.MIN_VALUE
  let minRawDiff = Number.MAX_VALUE
  let maxRawDiff = -1
  let maxDiffPoint: DiffPoint
  let diffCount = 0
  let totalRawDiff = 0

  if (datasetL && datasetR) {
    const times = new Set([...datasetL.keys(), ...datasetR.keys()])

    for (const t of times) {
      const valueL = datasetL.get(t)
      if (valueL !== undefined) {
        if (valueL < minValueL) minValueL = valueL
        if (valueL > maxValueL) maxValueL = valueL
        if (valueL < minValue) minValue = valueL
        if (valueL > maxValue) maxValue = valueL
      }

      // TODO: Explain
      let valueR: number
      const rawValueR = datasetR.get(t)
      if (rawValueR !== undefined) {
        if (matchPrecisionOfLeft && valueL !== undefined) {
          valueR = matchPrecision(rawValueR, valueL)
        } else {
          valueR = rawValueR
        }
        if (valueR < minValueR) minValueR = valueR
        if (valueR > maxValueR) maxValueR = valueR
        if (valueR < minValue) minValue = valueR
        if (valueR > maxValue) maxValue = valueR
      }

      if (valueL === undefined || valueR === undefined) {
        // Only include diffs if we have a value from both datasets at this time
        // console.error(`ERROR: Missing data for ${datasetKey}`)
        continue
      }

      const point = {
        time: t,
        valueL,
        valueR
      }
      points.set(t, point)

      const rawDiff = Math.abs(valueR - valueL)
      if (rawDiff < minRawDiff) {
        minRawDiff = rawDiff
      }
      if (rawDiff > maxRawDiff) {
        maxRawDiff = rawDiff
        maxDiffPoint = point
      }
      diffCount++
      // TODO: This might overflow if the numbers are very large
      totalRawDiff += rawDiff
    }
  }

  function pct(x: number): number {
    return x * 100
  }

  let minDiff: number
  let maxDiff: number
  let avgDiff: number
  if (minValueL === maxValueL && minValueR === maxValueR) {
    // When both values hold constant, it doesn't make sense to diff
    // against the spread, so use relative change instead (where the
    // left dataset is assumed to be the baseline/reference)
    const diff = pct(maxValueL !== 0 ? Math.abs((maxValueR - maxValueL) / maxValueL) : 1)
    minDiff = diff
    maxDiff = diff
    avgDiff = diff
  } else {
    // Otherwise, calculate the differences relative to the spread
    // (i.e., the distance between the extremes) of the two datasets
    const spread = maxValue - minValue
    minDiff = pct(spread > 0 ? minRawDiff / spread : 0)
    maxDiff = pct(spread > 0 ? maxRawDiff / spread : 0)
    const avgRawDiff = totalRawDiff / diffCount
    avgDiff = pct(spread > 0 ? avgRawDiff / spread : 0)
  }

  let validity: DiffValidity
  if (datasetL && datasetR) {
    validity = 'both'
  } else if (datasetL) {
    validity = 'left-only'
  } else if (datasetR) {
    validity = 'right-only'
  } else {
    validity = 'neither'
  }

  return {
    datasetKey,
    validity,
    points,
    minValue,
    maxValue,
    avgDiff,
    minDiff,
    maxDiff,
    maxDiffPoint
  }
}

/**
 * Change the precision of `x` to match that of `baseline`.  For example,
 * if `x` is 30.20000004 and `baseline is `30.2`, this will return `30.2`.
 */
function matchPrecision(x: number, baseline: number): number {
  const s = baseline.toString()
  if (s.includes('e')) {
    // TODO: This won't work for numbers with exponent notation
    return x
  }

  // TODO: This assumes English locale
  const parts = s.split('.')
  if (parts.length < 2) {
    return x
  }

  // Remove trailing zeros
  const sigDigits = parts[1].replace(/0+$/, '').length
  if (sigDigits > 21) {
    return x
  }

  return parseFloat(x.toFixed(sigDigits))
}

/**
 * Return all possible permutations of the given array elements.
 *
 * For example, if we have an array of numbers:
 *   [1,2,3]
 * this function will return all the permutations, e.g.:
 *   [ [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1] ]
 *
 * Based on:
 *   https://stackoverflow.com/a/20871714
 */
function permutationsOf<T>(inputArr: T[]): T[][] {
  const result: T[][] = []

  const permute = (arr: T[], m: T[] = []) => {
    if (arr.length === 0) {
      result.push(m)
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice()
        const next = curr.splice(i, 1)
        permute(curr.slice(), m.concat(next))
      }
    }
  }

  permute(inputArr)

  return result
}
