// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ScenarioSpec } from '../_shared/scenario-spec-types'
import { TaskQueue } from '../_shared/task-queue'
import type { Dataset, DatasetKey, DatasetMap } from '../_shared/types'

import type { BundleModel } from '../bundle/bundle-types'

import type { TraceDatasetReport, TraceReport } from './trace-report'
import type { DiffPoint, DiffValidity } from '../comparison/diff-datasets/diff-datasets'
import type { DatasetsResult } from '../_shared/data-source'

export interface TraceCompareToBundleOptions {
  kind: 'compare-to-bundle'
  bundleModel0: BundleModel
  scenarioSpec0: ScenarioSpec
  bundleModel1: BundleModel
  scenarioSpec1: ScenarioSpec
}

export interface TraceCompareToExtDataOptions {
  kind: 'compare-to-ext-data'
  extData: DatasetMap
  bundleModel: BundleModel
  scenarioSpec: ScenarioSpec
}

export type TraceOptions = TraceCompareToBundleOptions | TraceCompareToExtDataOptions

interface CompareToBundleRequest {
  kind: 'compare-to-bundle'
  datasetKeys: DatasetKey[]
  bundleModel0: BundleModel
  scenarioSpec0: ScenarioSpec
  bundleModel1: BundleModel
  scenarioSpec1: ScenarioSpec
}

interface CompareToExtDataRequest {
  kind: 'compare-to-ext-data'
  datasetKeys: DatasetKey[]
  extData: DatasetMap
  bundleModel: BundleModel
  scenarioSpec: ScenarioSpec
}

type TraceRequest = CompareToBundleRequest | CompareToExtDataRequest

interface TraceResponse {
  datasetReports: TraceDatasetReport[]
}

export class TraceRunner {
  private readonly taskQueue: TaskQueue<TraceRequest, TraceResponse>
  public onComplete?: (traceReport: TraceReport) => void
  public onError?: (error: Error) => void

  constructor() {
    this.taskQueue = new TaskQueue({
      process: async request => {
        switch (request.kind) {
          case 'compare-to-bundle': {
            let result0: DatasetsResult
            let result1: DatasetsResult
            if (request.bundleModel1 === request.bundleModel0) {
              // The bundles being compared are the same, so we need to run the model
              // for the two scenarios sequentially
              result0 = await request.bundleModel0.getDatasetsForScenario(request.scenarioSpec0, request.datasetKeys)
              result1 = await request.bundleModel1.getDatasetsForScenario(request.scenarioSpec1, request.datasetKeys)
            } else {
              // The bundles being compared are different, so we can run the model
              // for the two scenarios in parallel
              ;[result0, result1] = await Promise.all([
                request.bundleModel0.getDatasetsForScenario(request.scenarioSpec0, request.datasetKeys),
                request.bundleModel1.getDatasetsForScenario(request.scenarioSpec1, request.datasetKeys)
              ])
            }
            const datasetReports: TraceDatasetReport[] = []
            for (const datasetKey of request.datasetKeys) {
              const dataset0 = result0.datasetMap.get(datasetKey)
              const dataset1 = result1.datasetMap.get(datasetKey)
              const datasetReport = diffDatasets(datasetKey, dataset0, dataset1, /*matchPrecisionOfLeft=*/ false)
              datasetReports.push(datasetReport)
            }
            return {
              datasetReports
            }
          }
          case 'compare-to-ext-data': {
            const resultR = await request.bundleModel.getDatasetsForScenario(request.scenarioSpec, request.datasetKeys)
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
            return {
              datasetReports
            }
          }
          default:
            assertNever(request)
        }
      }
    })
  }

  start(options: TraceOptions): void {
    // Gather all dataset reports into a single map
    const allDatasetReports: Map<DatasetKey, TraceDatasetReport> = new Map()

    this.taskQueue.onIdle = error => {
      if (error) {
        this.onError?.(error)
      } else {
        const traceReport: TraceReport = {
          datasetReports: allDatasetReports
        }
        this.onComplete?.(traceReport)
      }
    }

    const taskQueue = this.taskQueue
    let index = 1
    function addTask(datasetKeys: DatasetKey[]) {
      const key = `${options.kind}-${index++}`
      let request: TraceRequest
      if (options.kind === 'compare-to-bundle') {
        request = {
          kind: 'compare-to-bundle',
          datasetKeys,
          bundleModel0: options.bundleModel0,
          scenarioSpec0: options.scenarioSpec0,
          bundleModel1: options.bundleModel1,
          scenarioSpec1: options.scenarioSpec1
        }
      } else {
        request = {
          kind: 'compare-to-ext-data',
          datasetKeys,
          extData: options.extData,
          bundleModel: options.bundleModel,
          scenarioSpec: options.scenarioSpec
        }
      }
      taskQueue.addTask(key, request, response => {
        // Add the dataset comparison reports to the rollup map
        for (const datasetReport of response.datasetReports) {
          allDatasetReports.set(datasetReport.datasetKey, datasetReport)
        }
      })
    }

    // Get the set of all dataset keys (as reported by the "right" bundle)
    const bundleModelR = options.kind === 'compare-to-bundle' ? options.bundleModel1 : options.bundleModel
    const allDatasetKeys: DatasetKey[] = [...bundleModelR.modelSpec.implVars.keys()]
    // console.log('ALL:')
    // console.log(allDatasetKeys)

    // Break the dataset requests into batches, with up to `batchSize` variables
    // in each batch
    const batchSize = 2000
    for (let i = 0; i < allDatasetKeys.length; i += batchSize) {
      const datasetKeysForBatch = allDatasetKeys.slice(i, i + batchSize)
      // TODO: Implement comparison to external data
      // console.log('BATCH:')
      // console.log(datasetKeysForBatch)
      addTask(datasetKeysForBatch)
    }
  }
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
