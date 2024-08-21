// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { beforeEach, describe, expect, it } from 'vitest'

import { _NA_ } from './js-model-constants'
import { getJsModelFunctions, type JsModelFunctionContext, type JsModelFunctions } from './js-model-functions'

describe('JsModelFunctions', () => {
  const fns = getJsModelFunctions()
  const ctx: JsModelFunctionContext = {
    timeStep: 1,
    currentTime: 0
  }

  beforeEach(() => {
    ctx.timeStep = 1
    ctx.currentTime = 0
    fns.setContext(ctx)
  })

  function fnsAtTime(t: number): JsModelFunctions {
    ctx.currentTime = t
    return fns
  }

  it('should expose ABS', () => {
    expect(fns.ABS(-1)).toBe(1)
  })

  it('should expose ARCCOS', () => {
    expect(fns.ARCCOS(1)).toBe(0)
  })

  it('should expose ARCSIN', () => {
    expect(fns.ARCSIN(0)).toBe(0)
  })

  it('should expose ARCTAN', () => {
    expect(fns.ARCTAN(1)).toBeCloseTo(Math.PI / 4)
  })

  it('should expose COS', () => {
    expect(fns.COS(0)).toBe(1)
  })

  it('should expose EXP', () => {
    expect(fns.EXP(2)).toBeCloseTo(Math.pow(Math.E, 2))
  })

  it('should expose GAME', () => {
    // Verify that it returns the `x` value when `inputs` is undefined
    expect(fns.GAME(undefined, 10)).toBe(10)

    // Verify that it returns the `x` value when `inputs` is empty
    const empty = fns.createLookup(0, [])
    expect(fns.GAME(empty, 10)).toBe(10)

    // Verify that it returns the `x` value when current time is earlier than the
    // first defined input point
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fnsAtTime(0.0).GAME(lookup, 10)).toBe(10)
    expect(fnsAtTime(0.5).GAME(lookup, 10)).toBe(10)

    // Verify that it returns the correct value from `inputs` when the time
    // is within the range of the lookup points
    expect(fnsAtTime(1.0).GAME(lookup, 10)).toBe(2)
    expect(fnsAtTime(1.5).GAME(lookup, 10)).toBe(2)
    expect(fnsAtTime(2.0).GAME(lookup, 10)).toBe(2)
    expect(fnsAtTime(2.5).GAME(lookup, 10)).toBe(2)
    expect(fnsAtTime(3.0).GAME(lookup, 10)).toBe(6)

    // Verify that it holds the last value when the time is greater than the
    // last defined input point
    expect(fnsAtTime(3.5).GAME(lookup, 10)).toBe(6)
    expect(fnsAtTime(4.0).GAME(lookup, 10)).toBe(6)
    expect(fnsAtTime(100).GAME(lookup, 10)).toBe(6)
  })

  // TODO
  // it('should expose GAMMA_LN', () => {
  //   expect(() => fns.GAMMA_LN(1)).toThrow('GAMMA_LN function not yet implemented for JS target')
  // })

  it('should expose INTEG', () => {
    const value = 2
    const rate = 3
    ctx.timeStep = 0.5
    expect(fnsAtTime(0).INTEG(value, rate)).toBe(3.5)
  })

  it('should expose INTEGER', () => {
    expect(fns.INTEGER(3.5)).toBe(3)
  })

  it('should expose LN', () => {
    expect(fns.LN(Math.E)).toBe(1)
  })

  it('should expose MAX', () => {
    expect(fns.MAX(3, 5)).toBe(5)
  })

  it('should expose MIN', () => {
    expect(fns.MIN(3, 5)).toBe(3)
  })

  it('should expose MODULO', () => {
    expect(fns.MODULO(10, 3)).toBe(1)
  })

  it('should expose POW', () => {
    expect(fns.POW(3, 2)).toBe(9)
  })

  it('should expose POWER', () => {
    expect(fns.POWER(3, 2)).toBe(9)
  })

  it('should expose PULSE', () => {
    // When start is 1 and width is 3, it should return 1 when time is in the range [1, 4)
    expect(fnsAtTime(0).PULSE(1, 3)).toBe(0)
    expect(fnsAtTime(1).PULSE(1, 3)).toBe(1)
    expect(fnsAtTime(2).PULSE(1, 3)).toBe(1)
    expect(fnsAtTime(3).PULSE(1, 3)).toBe(1)
    expect(fnsAtTime(4).PULSE(1, 3)).toBe(0)
    expect(fnsAtTime(5).PULSE(1, 3)).toBe(0)

    // When width is 0, it will use the current TIME STEP value (1) instead
    expect(fnsAtTime(0).PULSE(1, 0)).toBe(0)
    expect(fnsAtTime(1).PULSE(1, 0)).toBe(1)
    expect(fnsAtTime(2).PULSE(1, 0)).toBe(0)
    expect(fnsAtTime(3).PULSE(1, 0)).toBe(0)
  })

  it('should expose PULSE_TRAIN', () => {
    const firstPulseTime = 2
    const duration = 1
    const repeatInterval = 4
    const lastPulseTime = 7

    ctx.timeStep = 0.5
    expect(fnsAtTime(0.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(0.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(1.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(1.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(2.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(1)
    expect(fnsAtTime(2.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(1)
    expect(fnsAtTime(3.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(3.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(4.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(4.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(5.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(5.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(6.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(1)
    expect(fnsAtTime(6.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(1)
    expect(fnsAtTime(7.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(7.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(8.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(8.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(9.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(9.5).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
    expect(fnsAtTime(10.0).PULSE_TRAIN(firstPulseTime, duration, repeatInterval, lastPulseTime)).toBe(0)
  })

  it('should expose QUANTUM', () => {
    // If y is <= 0, it should return x
    expect(fns.QUANTUM(7, -2)).toBe(7)
    expect(fns.QUANTUM(7, 0)).toBe(7)

    // If y is > 0, it should return y*trunc(x/y)
    expect(fns.QUANTUM(7, 2)).toBe(6)
  })

  it('should expose RAMP', () => {
    const slope = 100
    const startTime = 2
    const endTime = 5
    expect(fnsAtTime(0).RAMP(slope, startTime, endTime)).toBe(0)
    expect(fnsAtTime(1).RAMP(slope, startTime, endTime)).toBe(0)
    expect(fnsAtTime(2).RAMP(slope, startTime, endTime)).toBe(0)
    expect(fnsAtTime(3).RAMP(slope, startTime, endTime)).toBe(100)
    expect(fnsAtTime(4).RAMP(slope, startTime, endTime)).toBe(200)
    expect(fnsAtTime(5).RAMP(slope, startTime, endTime)).toBe(300)
    expect(fnsAtTime(6).RAMP(slope, startTime, endTime)).toBe(300)
    expect(fnsAtTime(7).RAMP(slope, startTime, endTime)).toBe(300)
  })

  it('should expose SIN', () => {
    expect(fns.SIN(0)).toBe(0)
  })

  it('should expose SQRT', () => {
    expect(fns.SQRT(9)).toBe(3)
  })

  it('should expose STEP', () => {
    // STEP: currentTime + timeStep / 2.0 > stepTime ? height : 0.0
    const height = 5
    const stepTime = 15
    ctx.timeStep = 2
    expect(fnsAtTime(10).STEP(height, stepTime)).toBe(0)
    expect(fnsAtTime(13).STEP(height, stepTime)).toBe(0)
    expect(fnsAtTime(15).STEP(height, stepTime)).toBe(5)
    expect(fnsAtTime(17).STEP(height, stepTime)).toBe(5)
  })

  it('should expose TAN', () => {
    expect(fns.TAN(Math.PI / 4)).toBeCloseTo(1)
  })

  it('should expose VECTOR SORT ORDER', () => {
    expect(fns.VECTOR_SORT_ORDER([2100, 2010, 2020], 3, 1)).toEqual([1, 2, 0])
    expect(fns.VECTOR_SORT_ORDER([2100, 2010, 2020], 3, -1)).toEqual([0, 2, 1])
  })

  it('should expose XIDZ', () => {
    expect(fns.XIDZ(3, 4, 1)).toBe(0.75)
    expect(fns.XIDZ(3, 0, 1)).toBe(1)
  })

  it('should expose ZIDZ', () => {
    expect(fns.ZIDZ(3, 4)).toBe(0.75)
    expect(fns.ZIDZ(3, 0)).toBe(0)
  })

  it('should expose LOOKUP', () => {
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fns.LOOKUP(lookup, 0)).toBe(2)
    expect(fns.LOOKUP(lookup, 1)).toBe(2)
    expect(fns.LOOKUP(lookup, 2)).toBe(4)
    expect(fns.LOOKUP(lookup, 3)).toBe(6)
    expect(fns.LOOKUP(lookup, 4)).toBe(6)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.LOOKUP(empty, 0)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.LOOKUP(undefined, 0)).toBe(_NA_)
  })

  it('should expose LOOKUP_FORWARD', () => {
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fns.LOOKUP_FORWARD(lookup, 0)).toBe(2)
    expect(fns.LOOKUP_FORWARD(lookup, 1)).toBe(2)
    expect(fns.LOOKUP_FORWARD(lookup, 1.5)).toBe(6)
    expect(fns.LOOKUP_FORWARD(lookup, 2)).toBe(6)
    expect(fns.LOOKUP_FORWARD(lookup, 3)).toBe(6)
    expect(fns.LOOKUP_FORWARD(lookup, 4)).toBe(6)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.LOOKUP_FORWARD(empty, 0)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.LOOKUP_FORWARD(undefined, 0)).toBe(_NA_)
  })

  it('should expose LOOKUP_BACKWARD', () => {
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fns.LOOKUP_BACKWARD(lookup, 0)).toBe(2)
    expect(fns.LOOKUP_BACKWARD(lookup, 1)).toBe(2)
    expect(fns.LOOKUP_BACKWARD(lookup, 1.5)).toBe(2)
    expect(fns.LOOKUP_BACKWARD(lookup, 2)).toBe(2)
    expect(fns.LOOKUP_BACKWARD(lookup, 3)).toBe(6)
    expect(fns.LOOKUP_BACKWARD(lookup, 4)).toBe(6)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.LOOKUP_BACKWARD(empty, 0)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.LOOKUP_BACKWARD(undefined, 0)).toBe(_NA_)
  })

  it('should expose LOOKUP_INVERT', () => {
    // Inverted this looks like [2, 1, 6, 3]
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fns.LOOKUP_INVERT(lookup, 0)).toBe(1)
    expect(fns.LOOKUP_INVERT(lookup, 1)).toBe(1)
    expect(fns.LOOKUP_INVERT(lookup, 2)).toBe(1)
    expect(fns.LOOKUP_INVERT(lookup, 3)).toBe(1.5)
    expect(fns.LOOKUP_INVERT(lookup, 4)).toBe(2)
    expect(fns.LOOKUP_INVERT(lookup, 5)).toBe(2.5)
    expect(fns.LOOKUP_INVERT(lookup, 6)).toBe(3)
    expect(fns.LOOKUP_INVERT(lookup, 7)).toBe(3)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.LOOKUP_INVERT(empty, 0)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.LOOKUP_INVERT(undefined, 0)).toBe(_NA_)
  })

  it('should expose WITH_LOOKUP', () => {
    const lookup = fns.createLookup(2, [1, 2, 3, 6])
    expect(fns.WITH_LOOKUP(0, lookup)).toBe(2)
    expect(fns.WITH_LOOKUP(1, lookup)).toBe(2)
    expect(fns.WITH_LOOKUP(2, lookup)).toBe(4)
    expect(fns.WITH_LOOKUP(3, lookup)).toBe(6)
    expect(fns.WITH_LOOKUP(4, lookup)).toBe(6)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.WITH_LOOKUP(0, empty)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.WITH_LOOKUP(0, undefined)).toBe(_NA_)
  })

  it('should expose GET_DATA_BETWEEN_TIMES', () => {
    const lookup = fns.createLookup(
      5,
      [
        // t=0
        0, 0,
        // t=1
        1, 10,
        // t=2
        2, 20,
        // t=9
        9, 70,
        // t=10
        10, 80
      ]
    )

    // 0 == interpolate
    // These values were taken from the `getdata` sample model
    // for `Value for A1 at time plus one year interpolate`
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 0.0, 0)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 1.0, 0)).toBe(10)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 2.0, 0)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 3.0, 0)).toBeCloseTo(27.1429)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 4.0, 0)).toBeCloseTo(34.2857)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 5.0, 0)).toBeCloseTo(41.4286)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 6.0, 0)).toBeCloseTo(48.5714)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 7.0, 0)).toBeCloseTo(55.7143)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 8.0, 0)).toBeCloseTo(62.8571)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 9.0, 0)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 10.0, 0)).toBe(80)

    // 1 == forward
    // These values were taken from the `getdata` sample model
    // for `Value for A1 at time plus one year forward` and
    // for `Value for A1 at time plus half year forward`
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 0.0, 1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 0.5, 1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 1.0, 1)).toBe(10)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 1.5, 1)).toBe(10)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 2.0, 1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 2.5, 1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 3.0, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 3.5, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 8.0, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 8.5, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 9.0, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 9.5, 1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 10.0, 1)).toBe(80)

    // // -1 == backward
    // These values were taken from the `getdata` sample model
    // for `Value for A1 at time plus one year backward` and
    // for `Value for A1 at time plus half year backward`
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 0.0, -1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 0.5, -1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 1.0, -1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 1.5, -1)).toBe(0)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 2.0, -1)).toBe(10)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 2.5, -1)).toBe(10)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 3.0, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 3.5, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 8.0, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 8.5, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 9.0, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 9.5, -1)).toBe(20)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 10.0, -1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 10.5, -1)).toBe(70)
    expect(fns.GET_DATA_BETWEEN_TIMES(lookup, 11.0, -1)).toBe(70)

    // Verify that it returns _NA_ for an empty lookup
    const empty = fns.createLookup(0, [])
    expect(fns.GET_DATA_BETWEEN_TIMES(empty, 0, 0)).toBe(_NA_)

    // Verify that it returns _NA_ for an undefined lookup
    expect(fns.GET_DATA_BETWEEN_TIMES(undefined, 0, 0)).toBe(_NA_)
  })
})
