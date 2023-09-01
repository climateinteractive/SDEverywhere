import util from 'util'
import B from 'bufx'
import { parse as parseCsv } from 'csv-parse/sync'
import * as R from 'ramda'
import split from 'split-string'
import XLSX from 'xlsx'

// Set true to print a stack trace in vlog
export const PRINT_VLOG_TRACE = false

// next sequence number for generated temporary variable names
let nextTmpVarSeq = 1
// next sequence number for generated lookup variable names
let nextLookupVarSeq = 1
// next sequence number for generated fixed delay variable names
let nextFixedDelayVarSeq = 1
// next sequence number for generated depreciation variable names
let nextDepreciationVarSeq = 1
// next sequence number for generated level variable names
let nextLevelVarSeq = 1
// next sequence number for generated aux variable names
let nextAuxVarSeq = 1
// parsed csv data cache
let csvData = new Map()
// string table for web apps
export let strings = []

export let canonicalName = name => {
  // Format a model variable name into a valid C identifier.
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
export let decanonicalize = name => {
  // Decanonicalize the var name.
  name = name.replace(/^_/, '').replace(/_/g, ' ')
  // Vensim variable names need to be surrounded by quotes if they:
  // do not start with a letter
  // do not contain only letters, spaces, numbers, single quotes, and dollar signs.
  if (!name.match(/^[A-Za-z]/) || name.match(/[^A-Za-z0-9\s'$]/)) {
    name = `"${name}"`
  }
  return name
}
export let cFunctionName = name => {
  return canonicalName(name).toUpperCase()
}
export let isSeparatedVar = v => {
  return v.separationDims.length > 0
}
export let newTmpVarName = () => {
  // Return a unique temporary variable name
  return `__t${nextTmpVarSeq++}`
}
export let newLookupVarName = () => {
  // Return a unique lookup arg variable name
  return `_lookup${nextLookupVarSeq++}`
}
export let newFixedDelayVarName = () => {
  // Return a unique fixed delay variable name
  return `_fixed_delay${nextFixedDelayVarSeq++}`
}
export let newDepreciationVarName = () => {
  // Return a unique depreciation variable name
  return `_depreciation${nextDepreciationVarSeq++}`
}
export let newLevelVarName = (basename = null, levelNumber = 0) => {
  // Return a unique level variable name.
  let levelName = basename || nextLevelVarSeq++
  if (levelNumber) {
    levelName += `_${levelNumber}`
  }
  return `_level${levelName}`
}
export let newAuxVarName = (basename = null, auxNumber = 0) => {
  // Return a unique aux variable name.
  let auxName = basename || nextAuxVarSeq++
  if (auxNumber) {
    auxName += `_${auxNumber}`
  }
  return `_aux${auxName}`
}
export let isSmoothFunction = fn => {
  // Return true if fn is a Vensim smooth function.
  return fn === '_SMOOTH' || fn === '_SMOOTHI' || fn === '_SMOOTH3' || fn === '_SMOOTH3I'
}
export let isTrendFunction = fn => {
  // Return true if fn is a Vensim trend function.
  return fn === '_TREND'
}
export let isNpvFunction = fn => {
  // Return true if fn is a Vensim NPV function.
  return fn === '_NPV'
}
export let isDelayFunction = fn => {
  // Return true if fn is a Vensim delay function.
  return fn === '_DELAY1' || fn === '_DELAY1I' || fn === '_DELAY3' || fn === '_DELAY3I'
}
export let isArrayFunction = fn => {
  // Return true if fn is a Vensim array function.
  return fn === '_SUM' || fn === '_VECTOR_SELECT' || fn === '_VMAX' || fn === '_VMIN'
}
export let listConcat = (a, x, addSpaces = false) => {
  // Append a string x to string a with comma delimiters
  let s = addSpaces ? ' ' : ''
  if (R.isEmpty(x)) {
    return a
  } else {
    return a + (R.isEmpty(a) ? '' : `,${s}`) + x
  }
}
// Convert a number or string into a C double constant string.
// A blank string is converted to zero, following Excel.
// A string that cannot be converted throws an exception.
export let cdbl = x => {
  function throwError() {
    throw new Error(`ERROR: cannot convert "${x}" to a number`)
  }
  let s = '0.0'
  if (typeof x === 'number') {
    s = x.toString()
  } else if (typeof x === 'string') {
    if (x.trim() !== '') {
      let f = parseFloat(x)
      if (!Number.isNaN(f)) {
        s = f.toString()
      } else {
        throwError()
      }
    }
  } else {
    throwError()
  }
  // Format as a C double literal with a decimal point.
  if (!s.includes('.') && !s.toLowerCase().includes('e')) {
    s += '.0'
  }
  return s
}
export let strToConst = c => {
  let str = matchRegex(c, /'(.*)'/)
  if (str) {
    // Convert a Vensim string constant into a C string literal.
    return `"${str}"`
  } else {
    // Parse the string into a float.
    let d = parseFloat(c)
    return cdbl(d)
  }
}
export let first = a => R.head(a)
export let rest = a => R.tail(a)
export let extractMatch = (fn, list) => {
  // Return the first element of a list that matches the predicate and remove it from the list,
  // or return undefined if no element matches.
  let i = R.findIndex(fn, list)
  if (i >= 0) {
    return list.splice(i, 1)[0]
  } else {
    return undefined
  }
}
export let replaceInArray = (oldStr, newStr, a) => {
  // Replace the first occurrence of oldStr with newStr in an array of strings a.
  // A new array is constructed. The original array remains unchanged.
  let i = R.indexOf(oldStr, a)
  if (i >= 0) {
    let b = a.slice(0)
    b.splice(i, 1, newStr)
    return b
  } else {
    return a
  }
}
export let mapObjProps = (f, obj) => {
  // Map the key and value for each of the object's properties through function f.
  let result = {}
  R.forEach(k => (result[f(k)] = f(obj[k])), Object.keys(obj))
  return result
}
export let isIterable = obj => {
  // Return true of the object is iterable.
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}
export let stringToId = str => {
  // Look up a string id. Create the id from the string if it is not found.
  let stringIndex = R.indexOf(str, strings)
  if (stringIndex < 0) {
    stringIndex = strings.length
    strings.push(str)
  }
  return `id${stringIndex}`
}
// Command helpers
export let readXlsx = pathname => {
  return XLSX.readFile(pathname, { cellDates: true })
}
export let readCsv = (pathname, delimiter = ',') => {
  // Read the CSV file at the pathname and parse it with the given delimiter.
  // Return an array of rows that are each an array of columns.
  // If there is a header row, it is returned as the first row.
  // Cache parsed files to support multiple reads from different equations.
  let csv = csvData.get(pathname)
  if (csv == null) {
    const CSV_PARSE_OPTS = {
      delimiter,
      columns: false,
      trim: true,
      skip_empty_lines: false,
      skip_records_with_empty_values: false
    }
    try {
      let data = B.read(pathname)
      csv = parseCsv(data, CSV_PARSE_OPTS)
    } catch (err) {
      console.error(`ERROR: readCsv ${pathname} ${err.message}`)
    }
    csvData.set(pathname, csv)
  }
  return csv
}
// Convert the var name and subscript names to canonical form separately.
export let canonicalVensimName = vname => {
  let result = vname
  let m = vname.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (m) {
    result = canonicalName(m[1])
    if (m[2]) {
      let subscripts = m[2].split(',').map(x => canonicalName(x))
      result += `[${subscripts.join(',')}]`
    }
  }
  return result
}
// Split a model string into an array of equations without the "|" terminator.
// Allow "|" to occur in quoted variable names across line breaks.
// Retain the backslash character.
export let splitEquations = mdl => {
  return split(mdl, { separator: '|', quotes: ['"'], keep: () => true })
}
// Function to map over lists's value and index
export let mapIndexed = R.addIndex(R.map)
// Function to sort an array of strings
export let asort = R.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
// Function to alpha sort an array of variables on the model LHS
export let vsort = R.sort((a, b) => (a.modelLHS > b.modelLHS ? 1 : a.modelLHS < b.modelLHS ? -1 : 0))
// Function to list an array to stderr
export let printArray = R.forEach(x => console.error(x))
// Function to expand an array of strings into a comma-delimited list of strings
export let strlist = a => {
  return a.join(', ')
}
// Function to join an array with newlines
export let lines = R.join('\n')
// Match a string against a regular expression and return the first match.
// If a capturing group was present, return the first group, otherwise
// return the entire match. If the string did not match, return the empty string.
export let matchRegex = (str, regex) => {
  let m = str.match(regex)
  if (!m) {
    return ''
  } else if (m.length > 1) {
    return m[1]
  } else if (m.length > 0) {
    return m[0]
  }
}
// Match a string against a regular expression with capture groups.
// Return an array of matches for each capture group.
// If the string did not match, return the empty string.
export let matchRegexCaptures = (str, regex) => {
  let m = str.match(regex)
  if (m && m.length > 0) {
    return m.splice(1)
  } else {
    return []
  }
}
// Match delimiters recursively. Replace delimited strings globally.
export let replaceDelimitedStrings = (str, open, close, newStr) => {
  // str is the string to operate on.
  // open and close are the opening and closing delimiter characters.
  // newStr is the string to replace delimited substrings with.
  let result = ''
  let start = 0
  let depth = 0
  let n = str.length
  for (let i = 0; i < n; i++) {
    if (str.charAt(i) === open) {
      if (depth === 0) {
        result += str.substring(start, i)
      }
      depth++
    } else if (str.charAt(i) === close && depth > 0) {
      depth--
      if (depth === 0) {
        result += newStr
        start = i + 1
      }
    }
  }
  if (start < n) {
    result += str.substring(start)
  }
  return result
}

/**
 * Return the cartesian product of the given array of arrays.
 *
 * For example, if we have an array that lists out two dimensions:
 *   [ ['a1','a2'], ['b1','b2','b3'] ]
 * this function will return all the combinations, e.g.:
 *   [ ['a1', 'b1'], ['a1', 'b2'], ['a1', 'b3'], ['a2', 'b1'], ... ]
 *
 * This can be used in place of nested for loops and has the benefit of working
 * for multi-dimensional inputs.
 */
export const cartesianProductOf = arr => {
  // Implementation based on: https://stackoverflow.com/a/36234242
  return arr.reduce(
    (a, b) => {
      return a.map(x => b.map(y => x.concat([y]))).reduce((v, w) => v.concat(w), [])
    },
    [[]]
  )
}

/**
 * Return all possible permutations of the given array elements.
 *
 * For example, if we have an array of numbers:
 *   [1,2,3]
 * this function will return all the permutations, e.g.:
 *   [ [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1] ]
 */
export const permutationsOf = (elems, subperms = [[]]) => {
  // Implementation based on: https://gist.github.com/CrossEye/f7c2f77f7db7a94af209
  return R.isEmpty(elems)
    ? subperms
    : R.addIndex(R.chain)(
        (elem, idx) => permutationsOf(R.remove(idx, 1, elems), R.map(R.append(elem), subperms)),
        elems
      )
}

//
// Debugging helpers
//
export let vlog = (title, value, depth = 1) => {
  if (value) {
    console.error(title, ':', util.inspect(value, { depth: depth, colors: false }))
  } else {
    console.error(title)
  }
  if (PRINT_VLOG_TRACE) {
    console.trace()
  }
}
export let abend = error => {
  console.error(error)
  process.exit(1)
}
