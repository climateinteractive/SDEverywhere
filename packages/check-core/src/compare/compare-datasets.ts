// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Dataset, DatasetKey, DatasetMap, ScenarioKey } from '../_shared/types'
import type { CompareDatasetReport } from './compare-report'

export interface DiffPoint {
  time: number
  valueL: number
  valueR: number
}

export type DiffValidity = 'neither' | 'left-only' | 'right-only' | 'both'

export interface DiffReport {
  validity: DiffValidity
  minValue: number
  maxValue: number
  avgDiff: number
  minDiff: number
  maxDiff: number
  maxDiffPoint: DiffPoint
}

export function diffDatasets(datasetL: Dataset | undefined, datasetR: Dataset | undefined): DiffReport {
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

      const valueR = datasetR.get(t)
      if (valueR !== undefined) {
        if (valueR < minValueR) minValueR = valueR
        if (valueR > maxValueR) maxValueR = valueR
        if (valueR < minValue) minValue = valueR
        if (valueR > maxValue) maxValue = valueR
      }

      if (valueL === undefined || valueR === undefined) {
        // Only include diffs if we have a value from both datasets at this time
        continue
      }

      const rawDiff = Math.abs(valueR - valueL)
      if (rawDiff < minRawDiff) {
        minRawDiff = rawDiff
      }
      if (rawDiff > maxRawDiff) {
        maxRawDiff = rawDiff
        maxDiffPoint = {
          time: t,
          valueL,
          valueR
        }
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
    validity,
    minValue,
    maxValue,
    avgDiff,
    minDiff,
    maxDiff,
    maxDiffPoint
  }
}

export function compareDatasets(
  scenarioKey: ScenarioKey,
  datasetKey: DatasetKey,
  datasetMapL: DatasetMap,
  datasetMapR: DatasetMap
): CompareDatasetReport {
  const datasetL = datasetMapL.get(datasetKey)
  const datasetR = datasetMapR.get(datasetKey)
  const diffReport = diffDatasets(datasetL, datasetR)
  return {
    scenarioKey,
    datasetKey,
    diffReport
  }
}
