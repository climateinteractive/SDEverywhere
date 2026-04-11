// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Dataset } from '../_shared/types'
import type { CheckPredicateOp } from './check-predicate'
import type { CheckPredicateSpec, CheckPredicateTimeOptions, CheckPredicateTimeRange } from './check-spec'

export interface CheckResultErrorInfo {
  kind: 'unknown-dataset' | 'unknown-input' | 'unknown-input-group' | 'empty-input-group'
  name: string
}

export interface CheckResult {
  status: 'passed' | 'failed' | 'error' | 'skipped'
  message?: string
  failValue?: number
  failOp?: CheckPredicateOp
  failRefValue?: number
  failTime?: number
  errorInfo?: CheckResultErrorInfo
}

export type CheckFunc = (dataset: Dataset, refDatasets?: Map<CheckPredicateOp, Dataset>) => CheckResult

const passed: CheckResult = {
  status: 'passed'
}

type CheckValueCompareFunc = (a: number, b: number) => boolean

const gt: CheckValueCompareFunc = (a, b) => a > b
const gte: CheckValueCompareFunc = (a, b) => a >= b
const lt: CheckValueCompareFunc = (a, b) => a < b
const lte: CheckValueCompareFunc = (a, b) => a <= b
const eq: CheckValueCompareFunc = (a, b) => a === b
const approx = (tolerance: number) => {
  const f: CheckValueCompareFunc = (a, b) => {
    return a >= b - tolerance && a <= b + tolerance
  }
  return f
}

/**
 * Return a function that can check a given dataset to see if it meets
 * the criteria defined in the predicate spec.
 *
 * @param spec The dataset spec from a check test.
 */
export function checkFunc(spec: CheckPredicateSpec): CheckFunc | undefined {
  // Allow multiple value predicates in the same check (these are essentially
  // combined with boolean AND operations)
  type CheckValueFunc = (value: number, time: number, refDatasets?: Map<CheckPredicateOp, Dataset>) => CheckResult

  function addCheckValueFunc(op: CheckPredicateOp, compareFunc: CheckValueCompareFunc): void {
    const refSpec = spec[op]
    if (refSpec === undefined) {
      // No check defined for this op, so don't add a check func
      return
    }

    if (typeof refSpec === 'number') {
      checkValueFuncs.push((value, time) => {
        if (compareFunc(value, refSpec)) {
          return passed
        } else {
          return {
            status: 'failed',
            failValue: value,
            failTime: time
          }
        }
      })
    } else {
      checkValueFuncs.push((value, time, refDatasets) => {
        const refDataset = refDatasets?.get(op)
        if (refDataset === undefined) {
          // This should not happen in practice; treat it as an internal error
          return {
            status: 'error',
            message: 'unhandled data reference'
          }
        }
        const refValue = refDataset.get(time)
        if (refValue !== undefined) {
          if (compareFunc(value, refValue)) {
            return passed
          } else {
            return {
              status: 'failed',
              failValue: value,
              failOp: op,
              failRefValue: refValue,
              failTime: time
            }
          }
        } else {
          return {
            status: 'failed',
            message: 'no reference value',
            failTime: time
          }
        }
      })
    }
  }

  // Include a check for each op that is defined in the predicate
  const checkValueFuncs: CheckValueFunc[] = []
  addCheckValueFunc('gt', gt)
  addCheckValueFunc('gte', gte)
  addCheckValueFunc('lt', lt)
  addCheckValueFunc('lte', lte)
  addCheckValueFunc('eq', eq)
  if (spec.approx !== undefined) {
    const tolerance = spec.tolerance || 0.1
    addCheckValueFunc('approx', approx(tolerance))
  }

  // The check returns a 'passed' result only if all predicates passed
  const checkValue: CheckValueFunc = (value, time, refDatasets) => {
    for (const f of checkValueFuncs) {
      const result = f(value, time, refDatasets)
      if (result.status !== 'passed') {
        return result
      }
    }
    return passed
  }

  if (spec.time !== undefined && typeof spec.time === 'number') {
    // Only sample the value at the requested time
    const time: number = spec.time
    return (dataset, refDatasets) => {
      const value = dataset.get(time)
      if (value !== undefined) {
        return checkValue(value, time, refDatasets)
      } else {
        return {
          status: 'failed',
          message: 'no value',
          failTime: time
        }
      }
    }
  } else {
    // Sample the values that pass the included time predicate(s)
    type CheckTimeFunc = (time: number) => boolean
    let checkTime: CheckTimeFunc
    if (spec.time !== undefined) {
      if (Array.isArray(spec.time)) {
        // This is an inclusive range shorthand (e.g. `time: [0, 1]`)
        const timeSpec = spec.time as CheckPredicateTimeRange
        checkTime = time => time >= timeSpec[0] && time <= timeSpec[1]
      } else {
        // This is a full time spec with `after` and/or `before`.  Allow up
        // to two time predicates in the same check; this allows for range
        // comparisons (for example, after t0 AND before t1).
        const checkTimeFuncs: CheckTimeFunc[] = []
        const timeSpec = spec.time as CheckPredicateTimeOptions
        if (timeSpec.after_excl !== undefined) {
          checkTimeFuncs.push(time => time > timeSpec.after_excl)
        }
        if (timeSpec.after_incl !== undefined) {
          checkTimeFuncs.push(time => time >= timeSpec.after_incl)
        }
        if (timeSpec.before_excl !== undefined) {
          checkTimeFuncs.push(time => time < timeSpec.before_excl)
        }
        if (timeSpec.before_incl !== undefined) {
          checkTimeFuncs.push(time => time <= timeSpec.before_incl)
        }
        checkTime = time => {
          for (const f of checkTimeFuncs) {
            if (!f(time)) {
              return false
            }
          }
          return true
        }
      }
    } else {
      // No time predicate; sample all values
      checkTime = () => true
    }

    return (dataset, refDatasets) => {
      for (const [time, value] of dataset) {
        if (checkTime(time)) {
          const result = checkValue(value, time, refDatasets)
          if (result.status !== 'passed') {
            return result
          }
        }
      }
      return passed
    }
  }
}
