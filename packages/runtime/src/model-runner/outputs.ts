// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { Result } from 'neverthrow'
import { ok, err } from 'neverthrow'
import type { OutputVarId } from '../_shared'

/** Indicates the type of error encountered when parsing an outputs buffer. */
export type ParseError = 'invalid-point-count'

/** A data point. */
export interface Point {
  /** The x value (typically a year). */
  x: number
  /** The y value. */
  y: number
}

/**
 * A time series of data points for an output variable.
 */
export class Series {
  /**
   * @param varId The ID for the output variable (as used by SDEverywhere).
   * @param points The data points for the variable, one point per time increment.
   */
  constructor(public readonly varId: OutputVarId, public readonly points: Point[]) {}

  /**
   * Return the Y value at the given time.
   *
   * @param time The x (time) value.
   */
  getValueAtTime(time: number): number | undefined {
    // TODO: This assumes one data point per year; we should take `_saveper` into account
    // and if it's not 1 point per year, search for a specific x value
    // TODO: Add option to allow interpolation if the given time value is in between points
    const startTime = this.points[0].x
    return this.points[time - startTime]?.y
  }

  /**
   * Create a new `Series` instance that is a copy of this one.
   */
  copy(): Series {
    // Create a deep copy
    const pointsCopy = this.points.map(p => ({ ...p }))
    return new Series(this.varId, pointsCopy)
  }
}

/** Represents the outputs from a model run. */
export class Outputs {
  /** The number of data points in each series. */
  public readonly seriesLength: number
  /** The array of series, one for each output variable. */
  public readonly varSeries: Series[]

  /**
   * The latest model run time, in milliseconds.
   * @hidden This is not yet part of the public API; it is exposed here for use
   * in performance testing tools.
   */
  public runTimeInMillis: number

  constructor(
    public readonly varIds: OutputVarId[],
    public readonly timeStart: number,
    public readonly timeEnd: number
  ) {
    // Each series will include one data point per year, inclusive of the start and end years
    this.seriesLength = timeEnd - timeStart + 1

    // Create an array of arrays, one for each output variable
    this.varSeries = new Array(varIds.length)

    // Populate the arrays, filling in the time for each point
    for (let i = 0; i < varIds.length; i++) {
      const points: Point[] = new Array(this.seriesLength)
      let time = timeStart
      for (let j = 0; j < this.seriesLength; j++) {
        points[j] = { x: time++, y: 0 }
      }
      const varId = varIds[i]
      this.varSeries[i] = new Series(varId, points)
    }
  }

  /**
   * Parse the given raw float buffer (produced by the model) and store the values
   * into this `Outputs` instance.
   *
   * Note that the length of `outputsBuffer` must be greater than or equal to
   * the capacity of this `Outputs` instance.  The `Outputs` instance is allowed
   * to be smaller to support the case where you want to extract a subset of
   * the time range in the buffer produced by the model.
   *
   * @param outputsBuffer The raw outputs buffer produced by the model.
   * @param rowLength The number of elements per row (one element per year or save point).
   * @return An `ok` result if the buffer is valid, otherwise an `err` result.
   */
  updateFromBuffer(outputsBuffer: Float64Array, rowLength: number): Result<void, ParseError> {
    const result = parseOutputsBuffer(outputsBuffer, rowLength, this)
    if (result.isOk()) {
      return ok(undefined)
    } else {
      return err(result.error)
    }
  }

  /**
   * Return the series for the given output variable.
   *
   * @param varId The ID of the output variable (as used by SDEverywhere).
   */
  getSeriesForVar(varId: OutputVarId): Series | undefined {
    const seriesIndex = this.varIds.indexOf(varId)
    if (seriesIndex >= 0) {
      return this.varSeries[seriesIndex]
    } else {
      // TODO: Error
      return undefined
    }
  }
}

/**
 * Parse the raw buffer produced by the model and store the values in the
 * given (reused) `Outputs` object.
 *
 * @param outputsBuffer The raw outputs buffer produced by the model.
 * @param rowLength The number of elements per row (one element per year or save point).
 * @return An `ok` result if the buffer is valid, otherwise an `err` result.
 * @hidden
 */
function parseOutputsBuffer(
  outputsBuffer: Float64Array,
  rowLength: number,
  outputs: Outputs
): Result<Outputs, ParseError> {
  const varCount = outputs.varIds.length
  const seriesLength = outputs.seriesLength
  if (rowLength < seriesLength || outputsBuffer.length < varCount * seriesLength) {
    return err('invalid-point-count')
  }

  // The buffer populated by the C `runModelWithBuffers` function is already
  // transposed, so the first "row" contains the values for the first output
  // variable (from start time to end time), and so on.
  for (let outputVarIndex = 0; outputVarIndex < varCount; outputVarIndex++) {
    const series = outputs.varSeries[outputVarIndex]
    let sourceIndex = rowLength * outputVarIndex
    for (let valueIndex = 0; valueIndex < seriesLength; valueIndex++) {
      series.points[valueIndex].y = validateNumber(outputsBuffer[sourceIndex])
      sourceIndex++
    }
  }

  return ok(outputs)
}

/**
 * Return the given number if it is valid, or undefined if it is invalid.
 *
 * SDE converts Vensim's `:NA:` values to `-DBL_MAX`, so if we see a very large negative
 * value, convert it to `undefined`.  This is preferable to including extreme values
 * because some charting libraries (e.g. Chart.js) appear to choke on these large values
 * in certain browsers (e.g. Safari), but `undefined` appears to be handled better and
 * does a better job of signaling that the data point is undefined.
 *
 * @hidden
 */
function validateNumber(x: number): number | undefined {
  if (!isNaN(x) && x > -1e32) {
    return x
  } else {
    return undefined
  }
}
