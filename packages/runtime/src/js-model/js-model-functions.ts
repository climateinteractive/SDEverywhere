// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { _NA_ } from './js-model-constants'
import { JsModelLookup, type JsModelLookupMode } from './js-model-lookup'

// See XIDZ documentation for an explanation of this value:
//   https://www.vensim.com/documentation/fn_xidz.html
const EPSILON = 1e-6

/**
 * Provides access to the minimal set of control parameters that are used in the
 * implementation of certain model functions.
 *
 * @hidden This is not yet part of the public API; for internal use by generated
 * `JsModel` implementations.
 */
export interface JsModelFunctionContext {
  timeStep: number
  currentTime: number
}

/**
 * Exposes all the model function implementations that are called by a `JsModel` at runtime.
 *
 * @hidden This is not yet part of the public API; for internal use by generated
 * `JsModel` implementations.
 */
export interface JsModelFunctions {
  setContext(context: JsModelFunctionContext): void

  ABS(x: number): number
  ARCCOS(x: number): number
  ARCSIN(x: number): number
  ARCTAN(x: number): number
  COS(x: number): number
  EXP(x: number): number
  GAME(inputs: JsModelLookup, x: number): number
  // TODO
  // GAMMA_LN(x: number): number
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
  VECTOR_SORT_ORDER(vector: number[], size: number, direction: number): number[]
  XIDZ(a: number, b: number, x: number): number
  ZIDZ(a: number, b: number): number

  createLookup(size: number, data: number[] | Float64Array): JsModelLookup
  LOOKUP(lookup: JsModelLookup, x: number): number
  LOOKUP_FORWARD(lookup: JsModelLookup, x: number): number
  LOOKUP_BACKWARD(lookup: JsModelLookup, x: number): number
  LOOKUP_INVERT(lookup: JsModelLookup, y: number): number
  WITH_LOOKUP(x: number, lookup: JsModelLookup): number
  GET_DATA_BETWEEN_TIMES(lookup: JsModelLookup, x: number, mode: number): number

  // TODO
  // createFixedDelay(delayTime: number, initialValue: number): FixedDelay
  // DELAY_FIXED(input: number, fixedDelay: FixedDelay): number

  // TODO
  // createDepreciation(dtime: number, initialValue: number): Depreciation
  // DEPRECIATE_STRAIGHTLINE(input: number, depreciation: Depreciation): number
}

/**
 * Returns a default implementation of the `JsModelFunctions` interface.  If needed,
 * you can provide a custom implementation of any exposed function by overriding
 * (setting) a new function implementation on the returned instance.
 *
 * @hidden This is not yet part of the public API; for internal use by generated
 * `JsModel` implementations.
 */
export function getJsModelFunctions(): JsModelFunctions {
  let ctx: JsModelFunctionContext

  // The C implementation of `_VECTOR_SORT_ORDER` reuses an array, so we
  // will do the same for now (one reused array per size)
  const cachedVectors: Map<number, number[]> = new Map()
  const cachedSortVectors: Map<number, { x: number; ind: number }[]> = new Map()

  return {
    setContext(context: JsModelFunctionContext) {
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

    GAME(inputs: JsModelLookup, x: number): number {
      return inputs ? inputs.getValueForGameTime(ctx.currentTime, x) : x
    },

    // GAMMA_LN(): number {
    //   throw new Error('GAMMA_LN function not yet implemented for JS target')
    // },

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

    VECTOR_SORT_ORDER(vector: number[], size: number, direction: number): number[] {
      // Validate arguments
      if (size > vector.length) {
        throw new Error(`VECTOR SORT ORDER input vector length (${vector.length}) must be >= size (${size})`)
      }

      // Get a cached sort vector
      let sortVector = cachedSortVectors.get(size)
      if (sortVector === undefined) {
        sortVector = Array(size)
        for (let i = 0; i < size; i++) {
          sortVector[i] = { x: 0, ind: 0 }
        }
        cachedSortVectors.set(size, sortVector)
      }

      // Get a cached output array
      let outArray = cachedVectors.get(size)
      if (outArray === undefined) {
        outArray = Array(size)
        cachedVectors.set(size, outArray)
      }

      // Prepare for sorting
      for (let i = 0; i < size; i++) {
        sortVector[i].x = vector[i]
        sortVector[i].ind = i
      }

      // Sort in place
      const sortOrder = direction > 0 ? 1 : -1
      sortVector.sort((a, b) => {
        let result: number
        if (a.x < b.x) {
          result = -1
        } else if (a.x > b.x) {
          result = 1
        } else {
          result = 0
        }
        return result * sortOrder
      })

      // Copy the sorted index values into the output array
      for (let i = 0; i < size; i++) {
        outArray[i] = sortVector[i].ind
      }

      return outArray
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

    //
    // Lookup functions
    //

    createLookup(size: number, data: number[] | Float64Array): JsModelLookup {
      return new JsModelLookup(size, data)
    },

    LOOKUP(lookup: JsModelLookup, x: number): number {
      return lookup ? lookup.getValueForX(x, 'interpolate') : _NA_
    },

    LOOKUP_FORWARD(lookup: JsModelLookup, x: number): number {
      return lookup ? lookup.getValueForX(x, 'forward') : _NA_
    },

    LOOKUP_BACKWARD(lookup: JsModelLookup, x: number): number {
      return lookup ? lookup.getValueForX(x, 'backward') : _NA_
    },

    LOOKUP_INVERT(lookup: JsModelLookup, y: number): number {
      return lookup ? lookup.getValueForY(y) : _NA_
    },

    WITH_LOOKUP(x: number, lookup: JsModelLookup): number {
      return lookup ? lookup.getValueForX(x, 'interpolate') : _NA_
    },

    GET_DATA_BETWEEN_TIMES(lookup: JsModelLookup, x: number, mode: number): number {
      let lookupMode: JsModelLookupMode
      if (mode >= 1) {
        lookupMode = 'forward'
      } else if (mode <= -1) {
        lookupMode = 'backward'
      } else {
        lookupMode = 'interpolate'
      }
      return lookup ? lookup.getValueBetweenTimes(x, lookupMode) : _NA_
    }
  }
}

function pulse(ctx: JsModelFunctionContext, start: number, width: number): number {
  const timePlus = ctx.currentTime + ctx.timeStep / 2.0
  if (width === 0.0) {
    width = ctx.timeStep
  }
  return timePlus > start && timePlus < start + width ? 1.0 : 0.0
}
