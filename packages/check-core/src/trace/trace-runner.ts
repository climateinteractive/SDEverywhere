// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { allInputsAtPositionSpec } from '../_shared/scenario-specs'
import { TaskQueue } from '../_shared/task-queue'
import type { Dataset, DatasetKey, DatasetMap } from '../_shared/types'

import type { BundleModel } from '../bundle/bundle-types'

import type { TraceDatasetReport, TraceReport } from './trace-report'
import type { DiffPoint, DiffValidity } from '../comparison/diff-datasets/diff-datasets'

type TraceRequestKind = 'compare-to-left' | 'compare-to-ext-data'

interface TraceRequest {
  kind: TraceRequestKind
  datasetKeys: DatasetKey[]
  extData?: DatasetMap
}

interface TraceResponse {
  datasetReports: TraceDatasetReport[]
}

export class TraceRunner {
  private readonly taskQueue: TaskQueue<TraceRequest, TraceResponse>
  public onComplete?: (traceReport: TraceReport) => void
  public onError?: (error: Error) => void

  constructor(public readonly bundleModelL: BundleModel, public readonly bundleModelR: BundleModel) {
    // TODO: Allow for creating a TraceRunner instance with a specific scenario
    const scenarioSpec = allInputsAtPositionSpec('at-default')

    this.taskQueue = new TaskQueue({
      process: async request => {
        switch (request.kind) {
          case 'compare-to-left': {
            const [resultL, resultR] = await Promise.all([
              bundleModelL.getDatasetsForScenario(scenarioSpec, request.datasetKeys),
              bundleModelR.getDatasetsForScenario(scenarioSpec, request.datasetKeys)
            ])
            const datasetReports: TraceDatasetReport[] = []
            for (const datasetKey of request.datasetKeys) {
              const datasetL = resultL.datasetMap.get(datasetKey)
              const datasetR = resultR.datasetMap.get(datasetKey)
              const datasetReport = diffDatasets(datasetKey, datasetL, datasetR)
              datasetReports.push(datasetReport)
            }
            return {
              datasetReports
            }
          }
          case 'compare-to-ext-data': {
            const resultR = await bundleModelR.getDatasetsForScenario(scenarioSpec, request.datasetKeys)
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
              const datasetReport = diffDatasets(datasetKey, datasetL, datasetR)
              datasetReports.push(datasetReport)
            }
            return {
              datasetReports
            }
          }
          default:
            assertNever(request.kind)
        }
      }
    })
  }

  start(extData?: DatasetMap): void {
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
      const kind: TraceRequestKind = extData !== undefined ? 'compare-to-ext-data' : 'compare-to-left'
      const key = `${kind}-${index++}`
      const request: TraceRequest = {
        kind,
        datasetKeys,
        extData
      }
      taskQueue.addTask(key, request, response => {
        // Add the dataset comparison reports to the rollup map
        for (const datasetReport of response.datasetReports) {
          allDatasetReports.set(datasetReport.datasetKey, datasetReport)
        }
      })
    }

    // Get the set of all dataset keys
    const allDatasetKeys: DatasetKey[] = [...this.bundleModelR.modelSpec.implVars.keys()]
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
  datasetR: Dataset | undefined
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
        valueR = valueL !== undefined ? matchPrecision(rawValueR, valueL) : rawValueR
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

  // Remove leading zeros
  const a = parts[0].replace(/^0+/, '')
  const b = parts[1].replace(/^0+/, '')

  const sigDigits = a.length + b.length
  if (sigDigits > 21) {
    return x
  }

  return parseFloat(x.toPrecision(sigDigits))
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
