// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { _NA_ } from './js-model-constants'

export type JsModelLookupMode = 'interpolate' | 'forward' | 'backward'

/**
 * @hidden This is not yet part of the public API; for internal use only.
 */
export class JsModelLookup {
  private invertedData?: number[]
  private lastInput: number
  private lastHitIndex: number

  /**
   * @param n The number of (x,y) pairs in the lookup.
   * @param data The lookup data, as (x,y) pairs.  The length of the array must be
   * >= 2*n.  Note that the data will be stored by reference, so if there is a chance
   * that the array will be reused or modified by other code, be sure to pass in a
   * copy of the array.
   */
  constructor(private readonly n: number, private readonly data: number[] | Float64Array) {
    // Note that we reference the provided data without copying (assumed to be owned elsewhere)
    if (data.length < n * 2) {
      throw new Error(`Lookup data array length must be >= 2*size (length=${data.length} size=${n}`)
    }

    this.lastInput = Number.MAX_VALUE
    this.lastHitIndex = 0
  }

  public getValueForX(x: number, mode: JsModelLookupMode): number {
    return this.getValue(x, false, mode)
  }

  public getValueForY(y: number): number {
    if (this.invertedData === undefined) {
      // Invert the matrix and cache it
      const numValues = this.n * 2
      const normalData = this.data
      const invertedData = Array(numValues)
      for (let i = 0; i < numValues; i += 2) {
        invertedData[i] = normalData[i + 1]
        invertedData[i + 1] = normalData[i]
      }
      this.invertedData = invertedData
    }
    return this.getValue(y, true, 'interpolate')
  }

  /**
   * Interpolate the y value from the array of (x,y) pairs.
   * NOTE: The x values are assumed to be monotonically increasing.
   */
  private getValue(input: number, useInvertedData: boolean, mode: JsModelLookupMode): number {
    if (this.n === 0) {
      return _NA_
    }

    const data = useInvertedData ? this.invertedData : this.data
    const max = this.n * 2

    // Use the cached values for improved lookup performance, except in the case
    // of `LOOKUP INVERT` (since it may not be accurate if calls flip back and forth
    // between inverted and non-inverted data)
    const useCachedValues = !useInvertedData
    let startIndex: number
    if (useCachedValues && input >= this.lastInput) {
      startIndex = this.lastHitIndex
    } else {
      startIndex = 0
    }

    for (let xi = startIndex; xi < max; xi += 2) {
      const x = data[xi]
      if (x >= input) {
        // We went past the input, or hit it exactly
        if (useCachedValues) {
          this.lastInput = input
          this.lastHitIndex = xi
        }

        if (xi === 0 || x === input) {
          // The input is less than the first x, or this x equals the input; return the
          // associated y without interpolation
          return data[xi + 1]
        }

        // Calculate the y value depending on the lookup mode
        switch (mode) {
          default:
          case 'interpolate': {
            // Interpolate along the line from the last (x,y)
            const last_x = data[xi - 2]
            const last_y = data[xi - 1]
            const y = data[xi + 1]
            const dx = x - last_x
            const dy = y - last_y
            return last_y + (dy / dx) * (input - last_x)
          }
          case 'forward':
            // Return the next y value without interpolating
            return data[xi + 1]
          case 'backward':
            // Return the previous y value without interpolating
            return data[xi - 1]
        }
      }
    }

    // The input is greater than all the x values, so return the high end of the range
    if (useCachedValues) {
      this.lastInput = input
      this.lastHitIndex = max
    }
    return data[max - 1]
  }

  /**
   * Return the most appropriate y value from the array of (x,y) pairs when
   * this instance is used to provide inputs for the `GAME` function.
   *
   * NOTE: The x values are assumed to be monotonically increasing.
   *
   * This method is similar to `getValueForX` in concept, except that this one
   * returns the provided `defaultValue` if the `time` parameter is earlier than
   * the first data point in the lookup.  Also, this method always uses the
   * `backward` interpolation mode, meaning that it holds the "current" value
   * constant instead of interpolating.
   *
   * @param time The time that is used to select the data point that has an
   * `x` value less than or equal to the provided time.
   * @param defaultValue The value that is returned if this lookup is empty (has
   * no points) or if the provided time is earlier than the first data point.
   */
  public getValueForGameTime(time: number, defaultValue: number): number {
    if (this.n <= 0) {
      // The lookup is empty, so return the default value
      return defaultValue
    }

    const x0 = this.data[0]
    if (time < x0) {
      // The provided time is earlier than the first data point, so return the
      // default value
      return defaultValue
    }

    // For all other cases, we can use `getValue` with `backward` mode
    return this.getValue(time, false, 'backward')
  }

  /**
   * Interpolate the y value from the array of (x,y) pairs.
   * NOTE: The x values are assumed to be monotonically increasing.
   *
   * This method is similar to `getValue` in concept, but Vensim produces results for
   * the `GET DATA BETWEEN TIMES` function that differ in unexpected ways from normal
   * lookup behavior, so we implement it as a separate method here.
   */
  public getValueBetweenTimes(input: number, mode: JsModelLookupMode): number {
    if (this.n === 0) {
      return _NA_
    }

    const max = this.n * 2

    switch (mode) {
      case 'forward': {
        // Vensim appears to round non-integral input values down to a whole number
        // when mode is 1 (look forward), so we will do the same
        input = Math.floor(input)
        for (let xi = 0; xi < max; xi += 2) {
          const x = this.data[xi]
          if (x >= input) {
            return this.data[xi + 1]
          }
        }
        return this.data[max - 1]
      }
      case 'backward': {
        // Vensim appears to round non-integral input values down to a whole number
        // when mode is -1 (hold backward), so we will do the same
        input = Math.floor(input)
        for (let xi = 2; xi < max; xi += 2) {
          const x = this.data[xi]
          if (x >= input) {
            return this.data[xi - 1]
          }
        }
        if (max >= 4) {
          return this.data[max - 3]
        } else {
          return this.data[1]
        }
      }
      case 'interpolate':
      default: {
        // NOTE: This function produces results that match Vensim output for GET DATA BETWEEN TIMES with a
        // mode of 0 (interpolate), but only when the input values are integral (whole numbers).  If the
        // input value is fractional, Vensim produces bizarre/unexpected interpolated values.
        // TODO: For now we throw an error, but ideally we would match the Vensim results exactly.
        if (input - Math.floor(input) > 0) {
          let msg = `GET DATA BETWEEN TIMES was called with an input value (${input}) that has a fractional part. `
          msg += 'When mode is 0 (interpolate) and the input value is not a whole number, Vensim produces unexpected '
          msg += 'results that may differ from those produced by SDEverywhere.'
          throw new Error(msg)
        }
        for (let xi = 2; xi < max; xi += 2) {
          const x = this.data[xi]
          if (x >= input) {
            const last_x = this.data[xi - 2]
            const last_y = this.data[xi - 1]
            const y = this.data[xi + 1]
            const dx = x - last_x
            const dy = y - last_y
            return last_y + (dy / dx) * (input - last_x)
          }
        }
        return this.data[max - 1]
      }
    }
  }
}
