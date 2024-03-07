// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { beforeEach, describe, expect, it } from 'vitest'
import { getCoreFunctions, type CoreFunctionContext, type CoreFunctions } from './core-functions'

describe('CoreFunctions', () => {
  const fns = getCoreFunctions()
  const ctx: CoreFunctionContext = {
    initialTime: 0,
    finalTime: 10,
    timeStep: 1,
    currentTime: 0
  }

  beforeEach(() => {
    ctx.timeStep = 1
    ctx.currentTime = 0
    fns.setContext(ctx)
  })

  function fnsAtTime(t: number): CoreFunctions {
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

  // TODO
  it('should expose GAME', () => {
    expect(() => fns.GAME(1)).toThrow('GAME function not yet implemented for JS target')
  })

  // TODO
  it('should expose GAMMA_LN', () => {
    expect(() => fns.GAMMA_LN(1)).toThrow('GAMMA_LN function not yet implemented for JS target')
  })

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
    ctx.finalTime = 20
    ctx.timeStep = 2
    expect(fnsAtTime(10).STEP(height, stepTime)).toBe(0)
    expect(fnsAtTime(13).STEP(height, stepTime)).toBe(0)
    expect(fnsAtTime(15).STEP(height, stepTime)).toBe(5)
    expect(fnsAtTime(17).STEP(height, stepTime)).toBe(5)
  })

  it('should expose TAN', () => {
    expect(fns.TAN(Math.PI / 4)).toBeCloseTo(1)
  })

  // TODO
  it('should expose WITH_LOOKUP', () => {
    const lookup = [1, 2, 3]
    expect(() => fns.WITH_LOOKUP(1, lookup)).toThrow('WITH_LOOKUP function not yet implemented for JS target')
  })

  it('should expose XIDZ', () => {
    expect(fns.XIDZ(3, 4, 1)).toBe(0.75)
    expect(fns.XIDZ(3, 0, 1)).toBe(1)
  })

  it('should expose ZIDZ', () => {
    expect(fns.ZIDZ(3, 4)).toBe(0.75)
    expect(fns.ZIDZ(3, 0)).toBe(0)
  })
})
