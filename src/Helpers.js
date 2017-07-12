const path = require('path')
const util = require('util')
const R = require('ramda')
const sh = require('shelljs')

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

let canonicalName = name => {
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
let cFunctionName = name => {
  return canonicalName(name).toUpperCase()
}
let newTmpVarName = () => {
  // Return a unique temporary variable name
  return `__t${nextTmpVarSeq++}`
}
let newLookupVarName = () => {
  // Return a unique lookup arg variable name
  return `_lookup${nextLookupVarSeq++}`
}
let newLevelVarName = () => {
  // Return a unique level variable name
  return `_level${nextLevelVarSeq++}`
}
let newAuxVarName = () => {
  // Return a unique aux variable name
  return `_aux${nextAuxVarSeq++}`
}
let isSmoothFunction = fn => {
  // Return true if fn is a Vensim smooth function.
  return fn === '_SMOOTH' || fn === '_SMOOTHI' || fn === '_SMOOTH3' || fn === '_SMOOTH3I'
}
let isDelayFunction = fn => {
  // Return true if fn is a Vensim delay function.
  return fn === '_DELAY1' || fn === '_DELAY1I' || fn === '_DELAY3' || fn === '_DELAY3I'
}
let isArrayFunction = fn => {
  // Return true if fn is a Vensim array function.
  return fn === '_SUM' || fn === '_VECTOR_SELECT'
}
let listConcat = (a, x, addSpaces = false) => {
  // Append a string x to string a with comma delimiters
  let s = addSpaces ? ' ' : ''
  if (R.isEmpty(x)) {
    return a
  } else {
    return a + (R.isEmpty(a) ? '' : `,${s}`) + x
  }
}
let cdbl = x => {
  // Convert a number into a C double constant.
  let s = x.toString()
  if (!s.includes('.')) {
    s += '.0'
  }
  return s
}
let strToConst = c => {
  let d = parseFloat(c)
  return cdbl(d)
}
let extractMatch = (fn, list) => {
  // Return the first element of a list that matches the predicate and remove it from the list,
  // or return undefined if no element matches.
  let i = R.findIndex(fn, list)
  if (i >= 0) {
    return list.splice(i, 1)[0]
  } else {
    return undefined
  }
}
let replaceInArray = (oldStr, newStr, a) => {
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
let mapObjProps = (f, obj) => {
  // Map the key and value for each of the object's properties through function f.
  let result = {}
  R.forEach(k => (result[f(k)] = f(obj[k])), Object.keys(obj))
  return result
}
// Command helpers
let mdlPathProps = model => {
  // Normalize a model pathname that may or may not include the .mdl extension.
  // Return an object with properties that look like this:
  // modelDirname: '/Users/todd/src/models/arrays'
  // modelName: 'arrays'
  // modelPathname: '/Users/todd/src/models/arrays/arrays.mdl'
  let p = R.merge({ ext: '.mdl' }, R.pick(['dir', 'name'], path.parse(model)))
  return {
    modelDirname: p.dir,
    modelName: p.name,
    modelPathname: path.format(p)
  }
}
let execCmd = cmd => {
  // Run a command line silently in the "sh" shell. Print error output on error.
  sh.exec(cmd, { silent: true }, (status, stdout, stderr) => {
    if (status) {
      console.log(stderr)
    }
  })
}
// Function to map over lists's value and index
let mapIndexed = R.addIndex(R.map)
// Function to sort an array of strings
let asort = R.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
// Function to alpha sort an array of variables on the model LHS
let vsort = R.sort((a, b) => (a.modelLHS > b.modelLHS ? 1 : a.modelLHS < b.modelLHS ? -1 : 0))
// Function to list an array to stderr
let list = R.forEach(x => console.error(x))
// Function to expand an array of strings into a comma-delimited list of strings
let strlist = a => {
  return a.join(', ')
}
// Function to list a var to stderr
let listVar = v => {
  console.error(`${v.refId}: ${v.varType}`)
}
// Function to list an array of vars to stderr
let listVars = R.forEach(v => listVar(v))
// Function to join an array with newlines
let lines = R.join('\n')
//
// Debugging helpers
//
let vlog = (title, value, depth = 1) => {
  console.error(title, ':', util.inspect(value, { depth: depth, colors: false }))
  if (PRINT_VLOG_TRACE) {
    console.trace()
  }
}

module.exports = {
  asort,
  canonicalName,
  cdbl,
  cFunctionName,
  execCmd,
  extractMatch,
  isArrayFunction,
  isDelayFunction,
  isSmoothFunction,
  lines,
  list,
  listConcat,
  listVar,
  listVars,
  mapIndexed,
  mapObjProps,
  mdlPathProps,
  newAuxVarName,
  newLevelVarName,
  newLookupVarName,
  newTmpVarName,
  replaceInArray,
  strlist,
  strToConst,
  vlog,
  vsort
}
