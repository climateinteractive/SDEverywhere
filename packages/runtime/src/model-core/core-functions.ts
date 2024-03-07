// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { Lookup } from './lookup'

// See XIDZ documentation for an explanation of this value:
//   https://www.vensim.com/documentation/fn_xidz.html
const EPSILON = 1e-6

export interface CoreFunctionContext {
  initialTime: number
  finalTime: number
  timeStep: number
  currentTime: number
}

export interface CoreFunctions {
  setContext(context: CoreFunctionContext): void

  ABS(x: number): number
  ARCCOS(x: number): number
  ARCSIN(x: number): number
  ARCTAN(x: number): number
  COS(x: number): number
  EXP(x: number): number
  GAME(x: number): number
  GAMMA_LN(x: number): number
  INTEG(value: number, rate: number): number
  INTEGER(x: number): number
  LN(x: number): number
  MAX(x: number, y: number): number
  MIN(x: number, y: number): number
  MODULO(x: number, y: number): number
  POW(x: number, y: number): number
  POWER(x: number, y: number): number
  PULSE(start: number, width: number): number
  PULSE_TRAIN(start: number, width: number, interval: number, end: number): number
  QUANTUM(x: number, y: number): number
  RAMP(slope: number, startTime: number, endTime: number): number
  SIN(x: number): number
  SQRT(x: number): number
  STEP(height: number, stepTime: number): number
  TAN(x: number): number
  XIDZ(a: number, b: number, x: number): number
  ZIDZ(a: number, b: number): number

  createLookup(size: number, data: number[]): Lookup
  LOOKUP(lookup: Lookup, x: number): number
  LOOKUP_FORWARD(lookup: Lookup, x: number): number
  LOOKUP_BACKWARD(lookup: Lookup, x: number): number
  LOOKUP_INVERT(lookup: Lookup, y: number): number
  WITH_LOOKUP(x: number, lookup: Lookup): number
}

export function getCoreFunctions(): CoreFunctions {
  let ctx: CoreFunctionContext

  return {
    setContext(context: CoreFunctionContext) {
      ctx = context
    },

    ABS(x: number): number {
      return Math.abs(x)
    },

    ARCCOS(x: number): number {
      return Math.acos(x)
    },

    ARCSIN(x: number): number {
      return Math.asin(x)
    },

    ARCTAN(x: number): number {
      return Math.atan(x)
    },

    COS(x: number): number {
      return Math.cos(x)
    },

    EXP(x: number): number {
      return Math.exp(x)
    },

    GAME(): number {
      throw new Error('GAME function not yet implemented for JS target')
    },

    GAMMA_LN(): number {
      throw new Error('GAMMA_LN function not yet implemented for JS target')
    },

    INTEG(value: number, rate: number): number {
      return value + rate * ctx.timeStep
    },

    INTEGER(x: number): number {
      return Math.trunc(x)
    },

    LN(x: number): number {
      return Math.log(x)
    },

    MAX(x: number, y: number): number {
      return Math.max(x, y)
    },

    MIN(x: number, y: number): number {
      return Math.min(x, y)
    },

    MODULO(x: number, y: number): number {
      return x % y
    },

    POW(x: number, y: number): number {
      return Math.pow(x, y)
    },

    POWER(x: number, y: number): number {
      return Math.pow(x, y)
    },

    PULSE(start: number, width: number): number {
      return pulse(ctx, start, width)
    },

    PULSE_TRAIN(start: number, width: number, interval: number, end: number): number {
      const n = Math.floor((end - start) / interval)
      for (let k = 0; k <= n; k++) {
        if (ctx.currentTime <= end && pulse(ctx, start + k * interval, width)) {
          return 1.0
        }
      }
      return 0.0
    },

    QUANTUM(x: number, y: number): number {
      return y <= 0 ? x : y * Math.trunc(x / y)
    },

    RAMP(slope: number, startTime: number, endTime: number): number {
      // Return 0 until the start time is exceeded.
      // Interpolate from start time to end time.
      // Hold at the end time value.
      // Allow start time > end time.
      if (ctx.currentTime > startTime) {
        if (ctx.currentTime < endTime || startTime > endTime) {
          return slope * (ctx.currentTime - startTime)
        } else {
          return slope * (endTime - startTime)
        }
      } else {
        return 0.0
      }
    },

    SIN(x: number): number {
      return Math.sin(x)
    },

    SQRT(x: number): number {
      return Math.sqrt(x)
    },

    STEP(height: number, stepTime: number): number {
      return ctx.currentTime + ctx.timeStep / 2.0 > stepTime ? height : 0.0
    },

    TAN(x: number): number {
      return Math.tan(x)
    },

    XIDZ(a: number, b: number, x: number): number {
      return Math.abs(b) < EPSILON ? x : a / b
    },

    ZIDZ(a: number, b: number): number {
      if (Math.abs(b) < EPSILON) {
        return 0.0
      } else {
        return a / b
      }
    },

    createLookup(size: number, data: number[]): Lookup {
      return new Lookup(size, data)
    },

    LOOKUP(lookup: Lookup, x: number): number {
      return lookup.getValueForX(x, 'interpolate')
    },

    LOOKUP_FORWARD(lookup: Lookup, x: number): number {
      return lookup.getValueForX(x, 'forward')
    },

    LOOKUP_BACKWARD(lookup: Lookup, x: number): number {
      return lookup.getValueForX(x, 'backward')
    },

    LOOKUP_INVERT(lookup: Lookup, y: number): number {
      return lookup.getValueForY(y)
    },

    WITH_LOOKUP(x: number, lookup: Lookup): number {
      return lookup.getValueForX(x, 'interpolate')
    }
  }
}

function pulse(ctx: CoreFunctionContext, start: number, width: number): number {
  const timePlus = ctx.currentTime + ctx.timeStep / 2.0
  if (width === 0.0) {
    width = ctx.timeStep
  }
  return timePlus > start && timePlus < start + width ? 1.0 : 0.0
}
