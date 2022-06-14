// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Dataset } from '../_shared/types'
import type { CheckResult } from './check-func'
import { checkFunc } from './check-func'
import type { CheckPredicateOp } from './check-predicate'
import type { CheckPredicateRefSpec, CheckPredicateSpec } from './check-spec'

const passed: CheckResult = {
  status: 'passed'
}

function failed(
  valueOrMsg: number | string,
  time: number,
  failRefValue?: number,
  failOp?: CheckPredicateOp
): CheckResult {
  if (typeof valueOrMsg === 'string') {
    return {
      status: 'failed',
      message: valueOrMsg,
      failOp,
      failRefValue,
      failTime: time
    }
  } else {
    return {
      status: 'failed',
      failValue: valueOrMsg,
      failOp,
      failRefValue,
      failTime: time
    }
  }
}

describe('checkDataset', () => {
  const dataset = new Map([
    [2000, 0],
    [2050, 1],
    [2100, 2]
  ])

  const ref = (delta: number) => {
    return new Map([
      [2000, 0 + delta],
      [2050, 1 + delta],
      [2100, 2 + delta]
    ]) as Dataset
  }

  const check = (spec: CheckPredicateSpec) => {
    return checkFunc(spec)(dataset)
  }

  it('should work with gt', () => {
    expect(check({ gt: -1 })).toEqual(passed)
    expect(check({ gt: 0 })).toEqual(failed(0, 2000))
    expect(check({ gt: 0, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ gt: 0, time: 2050 })).toEqual(passed)
    expect(check({ gt: 1, time: 2100 })).toEqual(passed)
    expect(check({ gt: -1, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ gt: 1, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with gt when referencing another dataset', () => {
    const refX: CheckPredicateRefSpec = {
      dataset: {
        name: 'x'
      }
    }
    expect(checkFunc({ gt: refX })(dataset, new Map([['gt', ref(-1)]]))).toEqual(passed)
    expect(checkFunc({ gt: refX })(dataset, new Map([['gt', ref(0)]]))).toEqual(failed(0, 2000, 0, 'gt'))
    expect(checkFunc({ gt: refX, time: 1900 })(dataset, new Map([['gt', ref(-1)]]))).toEqual(failed('no value', 1900))
    expect(checkFunc({ gt: refX, time: 2050 })(dataset, new Map([['gt', ref(-1)]]))).toEqual(passed)
    expect(checkFunc({ gt: refX, time: { after_excl: 2050 } })(dataset, new Map([['gt', ref(-1)]]))).toEqual(passed)
  })

  it('should work with gte', () => {
    expect(check({ gte: -1 })).toEqual(passed)
    expect(check({ gte: 0 })).toEqual(passed)
    expect(check({ gte: 1 })).toEqual(failed(0, 2000))
    expect(check({ gte: 0, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ gte: 1, time: 2050 })).toEqual(passed)
    expect(check({ gte: 1, time: 2100 })).toEqual(passed)
    expect(check({ gte: 0, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ gte: 2, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with lt', () => {
    expect(check({ lt: 3 })).toEqual(passed)
    expect(check({ lt: 0 })).toEqual(failed(0, 2000))
    expect(check({ lt: 3, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ lt: 2, time: 2050 })).toEqual(passed)
    expect(check({ lt: 3, time: 2100 })).toEqual(passed)
    expect(check({ lt: 1, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ lt: 3, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with lte', () => {
    expect(check({ lte: 2 })).toEqual(passed)
    expect(check({ lte: 0 })).toEqual(failed(1, 2050))
    expect(check({ lte: 2, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ lte: 1, time: 2050 })).toEqual(passed)
    expect(check({ lte: 2, time: 2100 })).toEqual(passed)
    expect(check({ lte: 0, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ lte: 3, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with eq', () => {
    const dataset = new Map([
      [2000, 0],
      [2050, 0],
      [2100, 0]
    ])
    const check = (spec: CheckPredicateSpec) => {
      return checkFunc(spec)(dataset)
    }

    expect(check({ eq: 2 })).toEqual(failed(0, 2000))
    expect(check({ eq: 0 })).toEqual(passed)
    expect(check({ eq: 0, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ eq: 0, time: 2000 })).toEqual(passed)
    expect(check({ eq: 0, time: 2100 })).toEqual(passed)
    expect(check({ eq: 0, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ eq: 0, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with eq when referencing same dataset in same scenario', () => {
    const dataset = new Map([
      [2000, 0],
      [2050, -0.05],
      [2100, 0.05]
    ])

    const checkExact = (spec: CheckPredicateSpec) => {
      return checkFunc(spec)(dataset, new Map([['eq', dataset]]))
    }

    const eqSelfSpec = (spec?: CheckPredicateSpec) => {
      return {
        ...spec,
        eq: {
          dataset: 'inherit',
          scenario: 'inherit'
        }
      } as CheckPredicateSpec
    }

    expect(checkExact(eqSelfSpec())).toEqual(passed)
    expect(checkExact(eqSelfSpec({ time: 1900 }))).toEqual(failed('no value', 1900))
    expect(checkExact(eqSelfSpec({ time: 2000 }))).toEqual(passed)
    expect(checkExact(eqSelfSpec({ time: 2050 }))).toEqual(passed)
    expect(checkExact(eqSelfSpec({ time: 2100 }))).toEqual(passed)
    expect(checkExact(eqSelfSpec({ time: { before_excl: 2050 } }))).toEqual(passed)
    expect(checkExact(eqSelfSpec({ time: { after_excl: 2050 } }))).toEqual(passed)
  })

  it('should work with approx', () => {
    const dataset = new Map([
      [2000, 0],
      [2050, -0.05],
      [2100, 0.05]
    ])
    const check = (spec: CheckPredicateSpec) => {
      return checkFunc(spec)(dataset)
    }

    expect(check({ approx: 0.5 })).toEqual(failed(0, 2000))
    expect(check({ approx: 0 })).toEqual(passed)
    expect(check({ approx: 0, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ approx: 0, time: 2000 })).toEqual(passed)
    expect(check({ approx: 0, time: 2050 })).toEqual(passed)
    expect(check({ approx: 0, time: 2100 })).toEqual(passed)
    expect(check({ approx: 0, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ approx: 0, time: { after_excl: 2050 } })).toEqual(passed)

    expect(check({ approx: 0.5, tolerance: 0.01 })).toEqual(failed(0, 2000))
    expect(check({ approx: 0, tolerance: 0.01 })).toEqual(failed(-0.05, 2050))
    expect(check({ approx: 0, tolerance: 0.01, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ approx: 0, tolerance: 0.01, time: 2000 })).toEqual(passed)
    expect(check({ approx: 0, tolerance: 0.01, time: 2050 })).toEqual(failed(-0.05, 2050))
    expect(check({ approx: 0, tolerance: 0.01, time: 2100 })).toEqual(failed(0.05, 2100))
    expect(check({ approx: 0, tolerance: 0.01, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ approx: 0, tolerance: 0.01, time: { after_excl: 2050 } })).toEqual(failed(0.05, 2100))
  })

  it('should work with approx when referencing another dataset', () => {
    const dataset = new Map([
      [2000, 0],
      [2050, -0.05],
      [2100, 0.05]
    ])

    const ref = new Map([
      [2000, 0.01],
      [2050, -0.06],
      [2100, 0.04]
    ])

    const checkApprox = (spec: CheckPredicateSpec) => {
      return checkFunc(spec)(dataset, new Map([['approx', ref]]))
    }

    const refSpec = (tolerance: number, spec?: CheckPredicateSpec) => {
      return {
        ...spec,
        approx: {
          dataset: {
            name: 'x'
          }
        },
        tolerance
      } as CheckPredicateSpec
    }

    expect(checkApprox(refSpec(0.02))).toEqual(passed)
    expect(checkApprox(refSpec(0.02, { time: 1900 }))).toEqual(failed('no value', 1900))
    expect(checkApprox(refSpec(0.02, { time: 2000 }))).toEqual(passed)
    expect(checkApprox(refSpec(0.02, { time: 2050 }))).toEqual(passed)
    expect(checkApprox(refSpec(0.02, { time: 2100 }))).toEqual(passed)
    expect(checkApprox(refSpec(0.02, { time: { before_excl: 2050 } }))).toEqual(passed)
    expect(checkApprox(refSpec(0.02, { time: { after_excl: 2050 } }))).toEqual(passed)

    expect(checkApprox(refSpec(0.001))).toEqual(failed(0, 2000, 0.01, 'approx'))
    expect(checkApprox(refSpec(0.001, { time: 1900 }))).toEqual(failed('no value', 1900))
    expect(checkApprox(refSpec(0.001, { time: 2000 }))).toEqual(failed(0, 2000, 0.01, 'approx'))
    expect(checkApprox(refSpec(0.001, { time: 2050 }))).toEqual(failed(-0.05, 2050, -0.06, 'approx'))
    expect(checkApprox(refSpec(0.001, { time: 2100 }))).toEqual(failed(0.05, 2100, 0.04, 'approx'))
    expect(checkApprox(refSpec(0.001, { time: { before_excl: 2050 } }))).toEqual(failed(0, 2000, 0.01, 'approx'))
    expect(checkApprox(refSpec(0.001, { time: { after_excl: 2050 } }))).toEqual(failed(0.05, 2100, 0.04, 'approx'))
  })

  it('should work with range predicates', () => {
    expect(check({ gt: -1, lt: 3 })).toEqual(passed)
    expect(check({ gt: 0, lt: 3 })).toEqual(failed(0, 2000))
    expect(check({ gt: -1, lt: 2 })).toEqual(failed(2, 2100))
    expect(check({ gt: -1, lt: 3, time: 1900 })).toEqual(failed('no value', 1900))
    expect(check({ gt: -1, lt: 3, time: 2050 })).toEqual(passed)
    expect(check({ gt: -1, lt: 3, time: 2100 })).toEqual(passed)
    expect(check({ gt: -1, lt: 3, time: { before_excl: 2050 } })).toEqual(passed)
    expect(check({ gt: -1, lt: 3, time: { after_excl: 2050 } })).toEqual(passed)
  })

  it('should work with different time predicates', () => {
    expect(check({ eq: 1, time: 2050 })).toEqual(passed)

    expect(check({ eq: 1, time: [2040, 2060] })).toEqual(passed)
    expect(check({ gte: 0, lte: 2, time: [2000, 2100] })).toEqual(passed)
    expect(check({ gte: 0, lte: 1, time: [2000, 2050] })).toEqual(passed)
    expect(check({ gte: 1, lte: 2, time: [2050, 2100] })).toEqual(passed)
    expect(check({ gte: 0, lte: 2, time: [1900, 2200] })).toEqual(passed)

    expect(check({ gte: 0, time: { after_incl: 1900 } })).toEqual(passed)
    expect(check({ gte: 0, time: { after_incl: 2000 } })).toEqual(passed)
    expect(check({ gte: 1, time: { after_excl: 2000 } })).toEqual(passed)

    expect(check({ lte: 2, time: { before_incl: 2200 } })).toEqual(passed)
    expect(check({ lte: 2, time: { before_incl: 2100 } })).toEqual(passed)
    expect(check({ lte: 1, time: { before_excl: 2100 } })).toEqual(passed)

    expect(check({ gte: 0, lte: 2, time: { after_incl: 2000, before_incl: 2100 } })).toEqual(passed)
    expect(check({ gte: 0, lte: 1, time: { after_incl: 2000, before_excl: 2100 } })).toEqual(passed)

    expect(check({ gte: 1, lte: 2, time: { after_excl: 2000, before_incl: 2100 } })).toEqual(passed)
    expect(check({ eq: 1, time: { after_excl: 2000, before_excl: 2100 } })).toEqual(passed)
  })
})
