// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Dataset, DatasetMap } from '@sdeverywhere/check-core'

/**
 * Read a Vensim `dat` file with static data and return an object.
 * Each dataset consists of a key (the variable name in the format
 * used by SDE) and a map of time/value pairs.
 */
export function readDat(datText: string, prefix: string): DatasetMap {
  // TODO: Replace generic name with actual file name
  const datPathname = 'DAT file'
  const datLines = datText.split('\n')
  const datasetMap = new Map()

  let varName = ''
  let varPoints: Dataset = new Map()
  let lineNum = 1
  // let initialValue: number
  let timeForLastSavedValue = -1

  const splitDatLine = (line: string) => {
    const f = line.split('\t').map(s => s.trim())
    if (f.length < 2 || f[1] !== '') {
      return f
    } else {
      return [f[0]]
    }
  }

  const addValues = () => {
    // TODO: Only save vars that are listed in an provided array
    if (varName === '') {
      return
    }

    // A constant has a single value at the initial year. If it is earlier than
    // the start year for graphs, there will not be any data in varValues.
    // Emit the single value at the start year.
    // TODO: Restore this code
    // if (varValues.length === 0) {
    //   varValues = [{ x: dataset.minYear, y: initialValue }]
    // }
    const varId = sdeNameForVensimVarName(varName)
    datasetMap.set(`${prefix}${varId}`, varPoints)
  }

  const numValue = (s: string) => {
    return parseFloat(s)
  }

  // Read the dat file line by line
  for (const line of datLines) {
    const values = splitDatLine(line)
    if (values.length === 1) {
      // Lines with a single value are variable names that start a data section.
      // Save the values for the current var if we are not on the first one.
      addValues()
      // Start a new map for this variable
      varName = values[0]
      varPoints = new Map()
      timeForLastSavedValue = -1
    } else if (values.length > 1) {
      // Data lines in Vensim DAT format have {time}\t{value} format with optional comments afterward
      const t = Math.floor(parseFloat(values[0]))
      const value = numValue(values[1])
      // Save the value at time t in the varValues array if it is in the range we are graphing
      if (Number.isNaN(t)) {
        throw new Error(`Time value is NaN at line ${lineNum} in ${datPathname}`)
      } else if (Number.isNaN(value)) {
        throw new Error(`Value is NaN at line ${lineNum} in ${datPathname} for variable '${varName}' at time ${t}`)
      } else if (!Number.isFinite(value) || value < -1e32) {
        // SDE may produce -DBL_MAX (or Vensim may produce a very large negative number) for some values
        // that are undefined, so just omit those from the dat
        // console.warn(`DAT file ${datPathname}:${lineNum} var "${varName}" value is ${value} at time=${t}`)
      } else {
        // if (t === dataset.minYear) {
        //   initialValue = value
        // }
        // TODO: Only include data points that fall within the configured time range
        // if (t >= dataset.minYear && t <= dataset.maxYear) {
        // Some datasets have multiple data points within a given year (with fractional year values),
        // and there's no guarantee that there will be a data point with a whole number.  For now,
        // we will include the first data point in the year and ignore the others since the app only
        // needs one data point per year.  (This may result in values that are slightly different
        // than what Vensim would report, since Vensim may choose the last value from the previous
        // year instead of the first value for the current year as we do here.)
        if (t !== timeForLastSavedValue) {
          varPoints.set(t, value)
          timeForLastSavedValue = t
        }
        // }
      }
    }
    lineNum++
  }

  // Add the last dataset
  addValues()

  return datasetMap
}

/**
 * Helper function that converts a Vensim variable or subscript name
 * into a valid C identifier as used by SDE.
 * TODO: Import helper function from `compile` package instead
 */
function sdeNameForVensimName(name: string): string {
  return (
    '_' +
    name
      .trim()
      .replace(/"/g, '_')
      .replace(/\s+!$/g, '!')
      .replace(/\s/g, '_')
      .replace(/,/g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_')
      .replace(/\$/g, '_')
      .replace(/'/g, '_')
      .replace(/&/g, '_')
      .replace(/%/g, '_')
      .replace(/\//g, '_')
      .replace(/\|/g, '_')
      .toLowerCase()
  )
}

/**
 * Helper function that converts a Vensim variable name (possibly containing
 * subscripts) into a valid C identifier as used by SDE.
 * TODO: Import helper function from `compile` package instead
 */
function sdeNameForVensimVarName(varName: string): string {
  const m = varName.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (!m) {
    throw new Error(`Invalid Vensim name: ${varName}`)
  }
  let id = sdeNameForVensimName(m[1])
  if (m[2]) {
    const subscripts = m[2].split(',').map(x => sdeNameForVensimName(x))
    id += `[${subscripts.join(',')}]`
  }

  return id
}
