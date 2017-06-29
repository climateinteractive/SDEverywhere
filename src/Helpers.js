import * as path from 'path'
import * as util from 'util'
import * as R from 'ramda'
import * as Model from './Model'
import ModelLHSReader from './ModelLHSReader'
import { subscriptFamilies } from './Subscript'

// Set true to print a stack trace in vlog
const PRINT_VLOG_TRACE = false

// next sequence number for generated temporary variable names
let nextTmpVarSeq = 1
// next sequence number for generated lookup variable names
let nextLookupVarSeq = 1
// next sequence number for generated level variable names
let nextLevelVarSeq = 1
// next sequence number for generated aux variable names
let nextAuxVarSeq = 1

export function canonicalName(name) {
  // Format a model variable name into a valid C identifier.
  // The name is normalized by removing quotes, replacing spaces, periods, and dashes with underscores,
  // and converting to lower case, since Vensim ids are case-insensitive. Spaces at the
  // beginning and ending of names are discarded. An underscore is prepended to the name
  // because Vensim names can begin with numbers, which is not valid in C.
  return (
    '_' +
    name
      .replace(/"/g, '')
      .trim()
      .replace(/\s+!$/g, '!')
      .replace(/\s/g, '_')
      .replace(/,/g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_')
      .toLowerCase()
  )
}
export function cFunctionName(name) {
  return canonicalName(name).toUpperCase()
}
export function newTmpVarName() {
  // Return a unique temporary variable name
  return `__t${nextTmpVarSeq++}`
}
export function newLookupVarName() {
  // Return a unique lookup arg variable name
  return `_lookup${nextLookupVarSeq++}`
}
export function newLevelVarName() {
  // Return a unique level variable name
  return `_level${nextLevelVarSeq++}`
}
export function newAuxVarName() {
  // Return a unique aux variable name
  return `_aux${nextAuxVarSeq++}`
}
export function isSmoothFunction(fn) {
  // Return true if fn is a Vensim smooth function.
  return fn === '_SMOOTH' || fn === '_SMOOTHI' || fn === '_SMOOTH3' || fn === '_SMOOTH3I'
}
export function isDelayFunction(fn) {
  // Return true if fn is a Vensim delay function.
  return fn === '_DELAY1' || fn === '_DELAY1I' || fn === '_DELAY3' || fn === '_DELAY3I'
}
export function isArrayFunction(fn) {
  // Return true if fn is a Vensim array function.
  return fn === '_SUM' || fn === '_VECTOR_SELECT'
}
export function listConcat(a, x, addSpaces = false) {
  // Append a string x to string a with comma delimiters
  let s = addSpaces ? ' ' : ''
  if (R.isEmpty(x)) {
    return a
  } else {
    return a + (R.isEmpty(a) ? '' : `,${s}`) + x
  }
}
export function cdbl(x) {
  // Convert a number into a C double constant.
  let s = x.toString()
  if (!s.includes('.')) {
    s += '.0'
  }
  return s
}
export function strToConst(c) {
  let d = parseFloat(c)
  return cdbl(d)
}
export function cVarOrConst(expr) {
  // Get either a constant or a var name in C format from a parse tree expression.
  let value = expr.getText().trim()
  if (value === ':NA:') {
    return '_NA_'
  } else {
    let v = Model.varWithName(canonicalName(value))
    if (v) {
      return v.varName
    } else {
      let d = parseFloat(value)
      if (Number.isNaN(d)) {
        d = 0
      }
      return cdbl(d)
    }
  }
}
export function constValue(c) {
  // Get a numeric value from a constant var name in model form.
  // Return 0 if the value is not a numeric string or const variable.
  let value = parseFloat(c)
  if (!Number.isNaN(value)) {
    return value
  }
  // Look up the value as a symbol name and return the const value.
  value = 0
  let v = Model.varWithName(canonicalName(c))
  if (v && v.isConst()) {
    value = parseFloat(v.modelFormula)
    if (Number.isNaN(value)) {
      value = 0
    }
  }
  return value
}
export function extractMatch(fn, list) {
  // Return the first element of a list that matches the predicate and remove it from the list,
  // or return undefined if no element matches.
  let i = R.findIndex(fn, list)
  if (i >= 0) {
    return list.splice(i, 1)[0]
  } else {
    return undefined
  }
}
export function replaceInArray(oldStr, newStr, a) {
  // Replace the first occurrence of oldStr with newStr in array a.
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
export function mapObjProps(f, obj) {
  // Map the key and value for each of the object's properties through function f.
  let result = {}
  R.forEach(k => (result[f(k)] = f(obj[k])), Object.keys(obj))
  return result
}
// Function to map over lists's value and index
export let mapIndexed = R.addIndex(R.map)
// Function to sort an array of strings
export let asort = R.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
// Function to alpha sort an array of variables on the model LHS
export let vsort = R.sort((a, b) => (a.modelLHS > b.modelLHS ? 1 : a.modelLHS < b.modelLHS ? -1 : 0))
// Function to list an array to stderr
export let list = R.forEach(x => console.error(x))
// Function to expand an array of strings into a comma-delimited list of strings
export function strlist(a) {
  return a.join(', ')
}
// Function to list a var to stderr
export function listVar(v) {
  console.error(`${v.refId}: ${v.varType}`)
}
// Function to list an array of vars to stderr
export let listVars = R.forEach(v => listVar(v))
// Function to join an array with newlines
export let lines = R.join('\n')
//
// Debugging helpers
//
export function vlog(title, value, depth = 1) {
  console.error(title, ':', util.inspect(value, { depth: depth, colors: false }))
  if (PRINT_VLOG_TRACE) {
    console.trace()
  }
}
export function printVar(v) {
  let nonAtoA = Model.isNonAtoAName(v.varName) ? ' (non-apply-to-all)' : ''
  console.log(`${v.modelLHS}: ${v.varType}${nonAtoA}`)
  if (!v.hasPoints()) {
    console.log(`= ${v.modelFormula}`)
  }
  console.log(`refId(${v.refId})`)
  if (v.hasSubscripts()) {
    console.log(`families(${strlist(subscriptFamilies(v.subscripts))})`)
    console.log(`subscripts(${strlist(v.subscripts)})`)
  }
  if (v.separationDim) {
    console.log(`separationDim(${v.separationDim})`)
  }
  if (v.references.length > 0) {
    console.log(`refs(${strlist(v.references)})`)
  }
  if (v.initReferences.length > 0) {
    console.log(`initRefs(${strlist(v.initReferences)})`)
  }
  // if (v.hasPoints()) {
  //   console.log(R.map(p => `(${p[0]}, ${p[1]})`, v.points));
  // }
  console.log()
}
export function allModelVars() {
  // Return a list of Vensim model var names for all variables.
  function sortedVars() {
    // Return a list of all vars sorted by the model LHS var name (without subscripts), case insensitive.
    return R.sortBy(v => {
      let modelLHSReader = new ModelLHSReader()
      modelLHSReader.read(v.modelLHS)
      return modelLHSReader.varName.replace(/"/g, '').toUpperCase()
    }, Model.variables)
  }
  // Accumulate a list of model var names with subscripted vars expanded into separate vars with each index.
  // This matches the export format for Vensim DAT files.
  return R.uniq(
    R.reduce(
      (a, v) => {
        if (v.varType != 'lookup') {
          let modelLHSReader = new ModelLHSReader()
          modelLHSReader.read(v.modelLHS)
          return R.concat(a, modelLHSReader.names())
        } else {
          return a
        }
      },
      [],
      sortedVars()
    )
  )
}
