import B from 'bufx'
import yaml from 'js-yaml'
import * as R from 'ramda'

import { canonicalName, decanonicalize, isIterable, /*listConcat,*/ strlist, vlog, vsort } from '../_shared/helpers.js'
import {
  addIndex,
  allAliases,
  allDimensions,
  indexNamesForSubscript,
  isDimension,
  isIndex,
  sub,
  subscriptFamilies
} from '../_shared/subscript.js'

import { readEquation } from './read-equations.js'
import { readDimensionDefs } from './read-subscripts.js'
import { readVariables } from './read-variables.js'
import { reduceVariables } from './reduce-variables.js'
import toposort from './toposort.js'
import Variable from './variable.js'

let variables = []
let inputVars = []
let constantExprs = new Map()
let cachedSortedVarsByType = new Map()
let cachedVarIndexInfo
let cachedJsonList

// Also keep variables in a map (with `varName` as key) for faster lookup
const variablesByName = new Map()

let nonAtoANames = Object.create(null)
// Set true for diagnostic printing of init, aux, and level vars in sorted order.
const PRINT_SORTED_VARS = false
// Set true to print dependency graphs before they are sorted.
const PRINT_INIT_GRAPH = false
const PRINT_AUX_GRAPH = false
const PRINT_LEVEL_GRAPH = false

// XXX: This is needed for tests due to variables being in module-level storage
function resetModelState() {
  variables.length = 0
  inputVars.length = 0
  variablesByName.clear()
  constantExprs.clear()
  nonAtoANames = Object.create(null)
  cachedSortedVarsByType.clear()
  cachedVarIndexInfo = undefined
  cachedJsonList = undefined
}

/**
 * Read the given model parse tree and resolve all subscript and variable/equation definitions.
 *
 * Note that this function currently does not return anything and instead stores the parsed subscript
 * definitions in the `subscript` module and the parsed/analyzed variables in this module.
 *
 * TODO: FIX TYPE
 * @param {*} parsedModel The parsed model structure.
 * @param {*} spec The parsed `spec.json` object.
 * @param {Map<string, any>} extData The map of datasets from external `.dat` files.
 * @param {Map<string, any>} directData The mapping of dataset name used in a `GET DIRECT DATA`
 * call (e.g., `?data`) to the tabular data contained in the loaded data file.
 * @param {string} modelDirname The path to the directory containing the model (used for resolving data
 * files for `GET DIRECT SUBSCRIPT`).
 * @param {*} opts An optional object used by tests to stop the read process after a specific phase.
 */
function read(parsedModel, spec, extData, directData, modelDirname, opts) {
  // Some arrays need to be separated into variables with individual indices to
  // prevent eval cycles. They are manually added to the spec file.
  let specialSeparationDims = spec.specialSeparationDims
  // All arrays that have one of the specified dimension ID lists are
  // separated on those dimensions. This allows variables to be separated
  // without listing each one.
  let separateAllVarsWithDims = spec.separateAllVarsWithDims

  // Dimensions must be defined before reading variables that use them.
  readDimensionDefs(parsedModel, modelDirname)
  if (opts?.stopAfterReadSubscripts) return
  resolveDimensions(spec.dimensionFamilies)
  if (opts?.stopAfterResolveSubscripts) return

  // Read variables from the model parse tree.
  const vars = readVariables(parsedModel, specialSeparationDims, separateAllVarsWithDims)

  // Include a placeholder variable for the exogenous `Time` variable
  const timeVar = new Variable()
  timeVar.modelLHS = 'Time'
  timeVar.varName = '_time'
  vars.push(timeVar)

  // Add the variables to the `Model`
  vars.forEach(addVariable)
  if (opts?.stopAfterReadVariables) return

  if (spec) {
    // If the spec file contains `input/outputVarNames`, convert the full Vensim variable
    // names to C names first so that later phases only need to work with canonical names
    if (spec.inputVarNames) {
      spec.inputVars = R.map(cName, spec.inputVarNames)
    }
    if (spec.outputVarNames) {
      spec.outputVars = R.map(cName, spec.outputVarNames)
    }
    // Save the input vars locally so that they can be referenced by `isInputVar`.
    if (spec.inputVars) {
      inputVars = spec.inputVars
    }
  }

  // Analyze model equations to fill in more details about variables.
  analyze(parsedModel.kind, spec?.inputVars, opts)
  if (opts?.stopAfterAnalyze) return

  // Check that all input and output vars in the spec actually exist in the model.
  checkSpecVars(spec)

  // Remove variables that are not referenced by an input or output variable.
  removeUnusedVariables(spec)

  // Resolve duplicate declarations by converting to one variable type.
  resolveDuplicateDeclarations()
}

/**
 * Process the previously read subscript/dimension definitions (stored in the `subscript` module) to
 * resolve aliases, families, and indices.
 *
 * Note that this function currently does not return anything and only updates the set of dimension
 * and subscript definitions in the `subscript` module.
 *
 * @param {Object.<string, string>} dimensionFamilies The optional mapping of dimension name to family name
 * as provided in a `spec.json` file.
 */
function resolveDimensions(dimensionFamilies) {
  let allDims = allDimensions()

  // Expand dimensions that appeared in dimension definitions into subscripts/indices.
  // Repeat until there are only indices in dimension values.
  let dimFoundInValue
  do {
    dimFoundInValue = false
    for (let dim of allDims) {
      if (dim.value !== '') {
        let value = R.flatten(
          R.map(subscript => (isDimension(subscript) ? sub(subscript).value : subscript), dim.value)
        )
        if (!R.equals(value, dim.value)) {
          dimFoundInValue = true
          dim.value = value
          dim.size = value.length
        }
      }
    }
  } while (dimFoundInValue)

  // Fill in dimension aliases from their model families.
  for (let dim of allAliases()) {
    if (dim.value === '') {
      let refDim = sub(dim.family)
      dim.value = refDim.value
      dim.size = refDim.size
      dim.modelValue = refDim.modelValue
      allDims.push(dim)
    }
  }

  // Update the families of dimensions. At this point, all dimensions have their family
  // provisionally set to their own dimension name.
  let dimComparator = (dim1, dim2) => {
    // Sort dimensions by size ascending, by name descending.
    if (dim1.size < dim2.size) {
      return -1
    } else if (dim1.size > dim2.size) {
      return 1
    } else if (dim1.name > dim2.name) {
      return -1
    } else if (dim1.name < dim2.name) {
      return 1
    } else {
      return 0
    }
  }
  for (let dim of allDims) {
    // Try looking up the family in the spec file dimension families if they exist.
    if (dimensionFamilies && dimensionFamilies[dim.name]) {
      dim.family = dimensionFamilies[dim.name]
    } else {
      // Find the dimension in this family with the largest number of values.
      // This is the "maximal" dimension that serves as the subscript family.
      // If two dimensions have the same maximal size, choose the one that comes
      // first in alpha sort order, by convention.
      // Take the first index in the dimension.
      let index = dim.value[0]
      let familyDims = R.sort(
        dimComparator,
        R.filter(thisDim => R.contains(index, thisDim.value), allDims)
      )
      if (familyDims.length > 0) {
        dim.family = R.last(familyDims).name
      } else {
        console.error(`No family found for dimension ${dim.name}`)
      }
    }
  }

  // Define indices in order from the maximal (family) dimension.
  // Until now, only dimensions have been defined. We wait until dimension families have been
  // determined to define indices, so that they will belong to exactly one dimension (the family).
  for (let dim of allDims) {
    if (dim.family === dim.name) {
      for (let i = 0; i < dim.value.length; i++) {
        addIndex(dim.value[i], i, dim.family)
      }
    }
  }

  // When there is a subscript mapping, the mapping value pulled from the subscript range
  // in the model is either a map-to dimension with the same cardinality as the map-from
  // dimension, or a list of subscripts in the map-to dimension with the same cardinality
  // as the map-from dimension. The mapping value must be transformed into a list of
  // map-from indices in one-to-one correspondence with the map-to indices.
  for (let fromDim of allDims) {
    for (let toDimName in fromDim.mappings) {
      let toDim = sub(toDimName)
      let mappingValue = fromDim.mappings[toDimName]
      let invertedMappingValue = []
      if (R.isEmpty(mappingValue)) {
        // When there is no list of map-to subscripts, list fromDim indices.
        invertedMappingValue = fromDim.value
      } else {
        // The mapping value is a list of map-to subscripts.
        // List fromDim indices in the order in which they map onto toDim indices.
        // Indices are filled in the mapping value by map-to index number as they
        // occur in the map-from dimension.
        let setMappingValue = (toSubName, toIndNumber, fromIndName) => {
          if (Number.isInteger(toIndNumber) && toIndNumber >= 0 && toIndNumber < toDim.size) {
            invertedMappingValue[toIndNumber] = fromIndName
          } else {
            console.error(
              `ERROR: map-to index "${toSubName}" not found when mapping from dimension "${fromDim.name}" index "${fromIndName}"`
            )
          }
        }
        for (let i = 0; i < fromDim.value.length; i++) {
          let fromIndName = fromDim.value[i]
          let toSubName = mappingValue[i]
          let toSub = sub(toSubName)
          if (isDimension(toSubName)) {
            // Fill in indices from a dimension in the mapping value.
            for (let toIndName of toSub.value) {
              let toIndNumber = toDim.value.indexOf(toIndName)
              setMappingValue(toSubName, toIndNumber, fromIndName)
            }
          } else {
            // Fill in a single index from an index in the mapping value.
            let toIndNumber = toDim.value.indexOf(toSub.name)
            setMappingValue(toSubName, toIndNumber, fromIndName)
          }
        }
      }
      // Replace toDim subscripts in the mapping value with fromDim subscripts that map to them.
      fromDim.mappings[toDimName] = invertedMappingValue
    }
  }
}

function analyze(parsedModelKind, inputVars, opts) {
  // Analyze the RHS of each equation in stages after all the variables are read.
  // Find non-apply-to-all vars that are defined with more than one equation.
  findNonAtoAVars()

  // Set the refId for each variable. Only non-apply-to-all vars include subscripts in the refId.
  setRefIds()

  // If enabled, reduce expressions used in variable definitions.
  if (opts?.reduceVariables !== false && process.env.SDE_NONPUBLIC_REDUCE_VARIABLES !== '0') {
    let reduceMode = opts?.reduceVariables || process.env.SDE_NONPUBLIC_REDUCE_VARIABLES || 'default'
    reduceVariables(variables, inputVars || [], reduceMode)
  }
  if (opts?.stopAfterReduceVariables === true) return

  // Read the RHS to list the refIds of vars that are referenced and set the var type.
  variables.forEach(readEquation)
}

function checkSpecVars(spec) {
  // Look up each var in the spec and issue and throw error if it does not exist.

  function check(varNames, specType) {
    if (isIterable(varNames)) {
      for (let varName of varNames) {
        // TODO: This code as written does not check variables that include subscripts, but
        // we should check those as well (and make sure that subscripts or indices are not
        // out of the valid range)
        if (!R.contains('[', varName)) {
          if (!varWithRefId(varName)) {
            throw new Error(
              `The ${specType} variable ${varName} was declared in spec.json, but no matching variable was found in the model or external data sources`
            )
          }
        }
      }
    }
  }

  if (spec) {
    check(spec.inputVars, 'input')
    check(spec.outputVars, 'output')
  }
}

function removeUnusedVariables(spec) {
  // Remove any variables that are not referenced by an input or output variable.
  // This ensures that only computations that are relevant to the outputs are performed.

  // Only remove dead code if we have an explicit set of inputs and outputs
  if (!spec.outputVars || spec.outputVars.length === 0 || !spec.inputVars || spec.inputVars.length === 0) {
    return
  }

  // Keep track of all variable names that are referenced somewhere.  Note that we
  // don't attempt to track specific "ref ids" (e.g. `_some_variable[_subscript]`)
  // but instead just track generic variable names (e.g. `_some_variable`).  This
  // ensures that we include all subscripts for a variable, which might mean we
  // include some subscripts that aren't needed, but it is safer than trying to
  // eliminate those and possibly omit something that is needed.
  const referencedVarNames = new Set()

  // Add the given variable name to the list of referenced variables, if it's not
  // already there.
  const recordUsedVarName = varName => {
    referencedVarNames.add(varName)
  }

  // Add the given variable to the list of referenced variables, and do the same for
  // some special things (i.e., lookups) that it might reference.
  const recordUsedVariable = v => {
    // Add the variable to the list of referenced variables
    recordUsedVarName(v.varName)

    // Include any lookup variables that are referenced by this variable
    if (v.referencedLookupVarNames) {
      for (const lookupVarName of v.referencedLookupVarNames) {
        recordUsedVarName(lookupVarName)
      }
    }

    // Look through the list of function names that are referenced by this
    // variable and see if any of them are lookups (which should be included in
    // our list of referenced variables)
    if (v.referencedFunctionNames) {
      for (const fnName of v.referencedFunctionNames) {
        // Convert the function name (e.g. `__damage_lookup`) to a lookup var name (chop off
        // the leading underscore)
        const lookupName = fnName.slice(1)
        const varForFn = varWithName(lookupName)
        if (varForFn && varForFn.isLookup()) {
          recordUsedVarName(varForFn.varName)
        }
      }
    }
  }

  // Walk the reference tree rooted at the given var and record it (and anything
  // that it references) as being "used".
  const referencedRefIds = new Set()
  const recordRefsOfVariable = v => {
    // If this variable is subscripted, we need to record all subscript variants;
    // `refIdsWithName` will return those.  We also need to record all variables
    // that are referenced by this variable, either directly (`v.references`) or
    // in an "INITIAL" expression (`v.initReferences`).  It's OK if we end up with
    // duplicates in this list, because we will examine each reference only once.
    let refStack = []
    function pushRefs(v) {
      refStack.push(...refIdsWithName(v.varName))
      refStack.push(...v.references)
      refStack.push(...v.initReferences)
    }
    pushRefs(v)
    while (refStack.length > 0) {
      const refId = refStack.pop()
      if (!referencedRefIds.has(refId)) {
        referencedRefIds.add(refId)
        const refVar = varWithRefId(refId)
        if (refVar) {
          recordUsedVariable(refVar)
          pushRefs(refVar)
        } else {
          throw new Error(`No var found for ${refId} when recording references for ${v.varName}`)
        }
      }
    }
  }

  // Always keep special vars used by SDE
  recordUsedVarName('_initial_time')
  recordUsedVarName('_final_time')
  recordUsedVarName('_saveper')
  recordUsedVarName('_time_step')

  // Keep all input variables
  for (const inputVarName of spec.inputVars) {
    // The inputVars can include a raw index, e.g. `_input_var[0]`,
    // which isn't an actual "ref id", so we'll just derive the
    // var name by chopping off the index part.
    const inputVarBaseName = inputVarName.split('[')[0]
    for (const v of varsWithName(inputVarBaseName)) {
      recordUsedVariable(v)
    }
  }

  // Keep all output variables and the variables they depend on
  for (const outputVarName of spec.outputVars) {
    // The outputVars can include a raw index, e.g. `_output_var[0]`,
    // which isn't an actual "ref id", so we'll just derive the
    // var name by chopping off the index part.
    const outputVarBaseName = outputVarName.split('[')[0]
    for (const v of varsWithName(outputVarBaseName)) {
      recordUsedVariable(v)
      recordRefsOfVariable(v)
    }
  }

  // Filter out unneeded variables so we're left with the minimal set of variables to emit
  variables = R.filter(v => referencedVarNames.has(v.varName), variables)

  // Rebuild the variables-by-name map
  variablesByName.clear()
  for (const v of variables) {
    let varsForName = variablesByName.get(v.varName)
    if (!varsForName) {
      varsForName = []
      variablesByName.set(v.varName, varsForName)
    }
    varsForName.push(v)
  }
}
function resolveDuplicateDeclarations() {
  // Find subscripted const vars where some subscripts are data vars.
  // TODO consider doing the same for lookup vars
  // Least and greatest safe double values in C rounded to convenient consts
  const MIN_SAFE_DBL = -1e308
  const MAX_SAFE_DBL = 1e308
  let data = varsOfType('data')
  for (let constVar of varsOfType('const')) {
    if (data.find(d => d.varName === constVar.varName)) {
      // Change the var type from const to data and add lookup data points.
      // For a constant, the equivalent lookup has the same value over the entire x axis.
      let value = parseFloat(constVar.modelFormula)
      if (isNaN(value)) {
        console.error(`The value for const var ${constVar.refId} converted to a lookup is NaN.`)
      }
      constVar.varType = 'data'
      constVar.points = [
        [MIN_SAFE_DBL, value],
        [MAX_SAFE_DBL, value]
      ]
    }
  }
}
//
// Analysis helpers
//
function findNonAtoAVars() {
  // Find variables with multiple instances with the same var name, which makes them
  // elements in a non-apply-to-all array. This function constructs the nonAtoANames list.
  function areSubsEqual(vars, i) {
    // Scan the subscripts for each var at position i in the original order.
    // Return true if the subscript is the same for all vars with that name.
    let subscript = vars[0].subscripts[i]
    for (let v of vars) {
      if (v.subscripts[i] !== subscript) {
        return false
      }
    }
    return true
  }
  R.forEach(name => {
    let vars = varsWithName(name)
    if (vars.length > 1) {
      // This is a non-apply-to-all array. Construct the expansion dims array for it.
      // The expansion dim is true at each dim position where the subscript varies.
      let numDims = vars[0].subscripts.length
      let expansionDims = []
      for (let i = 0; i < numDims; i++) {
        expansionDims[i] = !areSubsEqual(vars, i)
      }
      nonAtoANames[name] = expansionDims
    }
  }, varNames())
}
function addNonAtoAVar(varName, expansionDims) {
  nonAtoANames[varName] = expansionDims
}
function setRefIds() {
  // Set the refId for each var. This requires knowing which vars are non-apply-to-all.
  R.forEach(v => {
    v.refId = refIdForVar(v)
  }, variables)
}
//
// Model API
//
function addVariable(v) {
  // Add the variable to the variables list.
  variables.push(v)

  // Add to the map of variables by name
  let varsForName = variablesByName.get(v.varName)
  if (!varsForName) {
    varsForName = []
    variablesByName.set(v.varName, varsForName)
  }
  varsForName.push(v)
}
function isNonAtoAName(varName) {
  return R.has(varName, nonAtoANames)
}
function expansionFlags(varName) {
  return nonAtoANames[varName]
}
function allVars() {
  // Return all vars except placeholders.
  function isNotPlaceholderVar(v) {
    return v.varName !== '_time'
  }
  return R.filter(isNotPlaceholderVar, variables)
}
function cachedSortedVars(varType, generate) {
  // Return the cached array of sorted variables for the given type if
  // available, otherwise call the `generate` function to generate the
  // array and cache it in the map.
  let vars = cachedSortedVarsByType.get(varType)
  if (!vars) {
    vars = generate()
    cachedSortedVarsByType.set(varType, vars)
  }
  return vars
}
function constVars() {
  // Return an array of vars of type `const`, sorted by LHS variable name.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('const', () => vsort(varsOfType('const')))
}
function lookupVars() {
  // Return an array of vars of type `lookup`, sorted by LHS variable name.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('lookup', () => vsort(varsOfType('lookup')))
}
function dataVars() {
  // Return an array of vars of type `data`, sorted by LHS variable name.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('data', () => vsort(varsOfType('data')))
}
function auxVars() {
  // Return an array of vars of type `aux`, sorted according to the dependency graph.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('aux', () => sortVarsOfType('aux'))
}
function levelVars() {
  // Return an array of vars of type `level`, sorted according to the dependency graph.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('level', () => sortVarsOfType('level'))
}
function initVars() {
  // Return an array of all vars that have the `hasInitValue` flag set to true,
  // sorted according to the dependency graph.
  // Note that this caches the result, so should only be called after the
  // model has been fully read and analyzed.
  return cachedSortedVars('init', () => sortInitVars())
}
function varWithRefId(refId) {
  const findVarWithRefId = rid => {
    // First see if we have a map key where ref id matches the var name
    let varsForName = variablesByName.get(rid)
    if (varsForName) {
      const v = R.find(R.propEq('refId', rid), varsForName)
      if (v) {
        return v
      }
    }

    // Failing that, chop off the subscript part of the ref id and
    // find the variables that share that name
    const varNamePart = rid.split('[')[0]
    varsForName = variablesByName.get(varNamePart)
    if (varsForName) {
      const v = R.find(R.propEq('refId', rid), varsForName)
      if (v) {
        return v
      }
    }

    return undefined
  }

  // Find a variable from a reference id.
  // A direct reference will find scalar vars, apply-to-all arrays, and non-apply-to-all array
  // elements defined by individual index.
  let refVar = findVarWithRefId(refId)
  if (!refVar) {
    // Look at variables with the reference's varName to find one with matching subscripts.
    let refIdParts = splitRefId(refId)
    let refVarName = refIdParts.varName
    let refSubscripts = refIdParts.subscripts
    let varRefIds = refIdsWithName(refVarName)
    for (const varRefId of varRefIds) {
      let { subscripts } = splitRefId(varRefId)
      // Compare subscripts at each position in normal order. If the var name does not have subscripts,
      // the match will succeed, since the var is an apply-to-all array that includes the refId.
      let matches = true
      for (let pos = 0; pos < subscripts.length; pos++) {
        // If both subscripts are an index or dimension, they must match.
        if (
          (isIndex(subscripts[pos]) && isIndex(refSubscripts[pos])) ||
          (isDimension(subscripts[pos]) && isDimension(refSubscripts[pos]))
        ) {
          if (subscripts[pos] !== refSubscripts[pos]) {
            matches = false
            break
          }
        } else if (isDimension(subscripts[pos]) && isIndex(refSubscripts[pos])) {
          // If the ref subscript is an index and the var subscript is a dimension,
          // they match if the dimension includes the index.
          if (!sub(subscripts[pos]).value.includes(refSubscripts[pos])) {
            matches = false
            break
          }
        } else {
          // We should not encounter a case where the ref subscript is a dimension
          // and the var subscript is an index.
          matches = false
          break
        }
      }
      if (matches) {
        refVar = findVarWithRefId(varRefId)
        break
      }
    }
    if (!refVar) {
      // vlog('ERROR: no var found for refId', refId)
    }
  }
  return refVar
}
function splitRefId(refId) {
  // Split a refId into component parts with a regular expression matching var name and subscripts.
  let re = /\w+|\[/g
  let inSubs = false
  let varName = ''
  let subscripts = []
  let m
  while ((m = re.exec(refId))) {
    if (m[0] === '[') {
      inSubs = true
    } else if (inSubs) {
      subscripts.push(m[0])
    } else {
      varName = m[0]
    }
  }
  return { varName, subscripts }
}
function varWithName(varName) {
  // Find a variable with the given name in canonical form.
  // The function returns the first instance of a non-apply-to-all variable with the name.
  const varsForName = variablesByName.get(varName)
  if (varsForName && varsForName.length > 0) {
    return varsForName[0]
  } else {
    return undefined
  }
}
function varsWithName(varName) {
  // Find all variables with the given name in canonical form.
  return variablesByName.get(varName) || []
}
function refIdsWithName(varName) {
  // Find refIds of all variables with the given name in canonical form.
  return varsWithName(varName).map(v => v.refId)
}
function varNames() {
  // Return a sorted list of var names.
  return R.uniq(Array.from(variablesByName.keys())).sort()
}
function vensimName(cVarName) {
  // Convert a C variable name to a Vensim name.
  let result = cVarName
  // Get the variable name and subscripts with regexes.
  let m = cVarName.match(/(_[A-Za-z0-9_]+)((\[\d+\])*)/)
  if (m) {
    let varName = m[1]
    let indexNumbers = []
    for (let x of m[2].matchAll(/\[(\d+)\]/g)) {
      indexNumbers.push(x[1])
    }
    // Get the subscript families and look up the subscript names.
    let subscripts = []
    let v = varWithName(varName)
    if (v) {
      // Ensure that the C var name is subscripted when the var has subscripts.
      if (R.isEmpty(v.subscripts) || !R.isEmpty(indexNumbers)) {
        m = v.modelLHS.match(/[^[]+/)
        if (m) {
          result = m[0]
        }
        let families = subscriptFamilies(v.subscripts)
        for (let i = 0; i < families.length; i++) {
          let indexNames = indexNamesForSubscript(families[i])
          let indexNumber = Number.parseInt(indexNumbers[i])
          let indexModelName = decanonicalize(indexNames[indexNumber])
          subscripts.push(indexModelName)
        }
        if (!R.isEmpty(subscripts)) {
          result += `[${subscripts.join(',')}]`
        }
      } else {
        console.error(`${cVarName} has no subscripts in vensimName`)
      }
    } else {
      console.error(`no var with name ${varName} in vensimName`)
    }
  }
  return result
}
function cName(vensimVarName) {
  // Convert a Vensim variable name to a C name.
  // This function requires model analysis to be completed first when the variable has subscripts.

  // Split the variable name from the subscripts
  let matches = vensimVarName.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (!matches) {
    throw new Error(`Invalid variable name '${vensimVarName}' found when converting to C representation`)
  }
  let cVarName = canonicalName(matches[1])
  if (matches[2]) {
    // The variable name includes subscripts, so split them into individual IDs
    let cSubIds = matches[2].split(',').map(x => canonicalName(x))
    // If a subscript is an index, convert it to an index number to match Vensim data exports
    let cSubIdParts = cSubIds.map(cSubId => {
      return isIndex(cSubId) ? `[${sub(cSubId).value}]` : `[${cSubId}]`
    })
    // Append the subscript parts to the base variable name to create the full reference
    cVarName += cSubIdParts.join('')
  }
  return cVarName
}
function isInputVar(varName) {
  // Return true if the given variable (in canonical form) is included in the list of
  // input variables in the spec file.
  return inputVars.includes(varName)
}
function addConstantExpr(exprText, constantValue) {
  // Record the constant value for the given expression in a map for later lookup.
  constantExprs.set(exprText, constantValue)
}
function getConstantExprValue(exprText) {
  // Return the constant value for the given expression if one was recorded.
  return constantExprs.get(exprText)
}
//
// Helpers for getting lists of vars
//
function varsOfType(varType, vars = null) {
  // Extract vars of the given var type.
  if (!vars) {
    vars = variables
  }
  function pass(v) {
    return v.varType === varType && v.varName !== '_time'
  }
  return R.filter(pass, vars)
}
function sortVarsOfType(varType) {
  if (PRINT_SORTED_VARS) {
    console.error(varType.toUpperCase())
  }

  // Get vars with varType 'aux' or 'level' sorted in dependency order at eval time.
  // Start with vars of the given varType.
  let vars = varsOfType(varType)

  // Accumulate a list of variable dependencies as var pairs.
  let graph = R.unnest(R.map(v => refs(v), vars))
  function refs(v) {
    // Return a list of dependency pairs for all vars referenced by v at eval time.
    let refs = R.map(refId => varWithRefId(refId), v.references)
    // Only consider references having the correct var type.
    // Remove duplicate references.
    refs = R.uniq(R.filter(R.propEq('varType', varType), refs))
    // Return the list of dependencies as refId pairs.
    return R.map(ref => {
      if (v.varType === 'level' && ref.varType === 'level') {
        // Reverse the order of level-to-level references so that level evaluation refers
        // to the value in the previous time step rather than the currently evaluated one.
        return [ref.refId, v.refId]
      } else {
        return [v.refId, ref.refId]
      }
    }, refs)
  }

  // Sort into an lhs dependency list.
  if (PRINT_AUX_GRAPH) printDepsGraph(graph, 'AUX')
  if (PRINT_LEVEL_GRAPH) printDepsGraph(graph, 'LEVEL')
  let deps = toposort(graph).reverse()

  // Turn the dependency-sorted var name list into a var list.
  let sortedVars = varsOfType(
    varType,
    R.map(refId => varWithRefId(refId), deps)
  )

  // Add the ref ids to a set for faster lookup in the next step
  const sortedVarRefIds = new Set()
  for (const v of sortedVars) {
    sortedVarRefIds.add(v.refId)
  }

  // Find vars of the given varType with no dependencies, and add them to the list.
  const nodepVars = R.filter(v => !sortedVarRefIds.has(v.refId), vars)
  const sortedNodepVars = vsort(nodepVars)
  sortedVars = R.concat(sortedNodepVars, sortedVars)

  if (PRINT_SORTED_VARS) {
    sortedVars.forEach(v => console.error(`${v.refId}`))
  }
  return sortedVars
}
function sortInitVars() {
  if (PRINT_SORTED_VARS) {
    console.error('INIT')
  }

  // Get dependencies at init time for vars with init values, such as levels.
  // This will be a subgraph of all dependencies rooted in vars with init values.
  // Therefore, we have to recurse into dependencies starting with those vars.
  let initVars = R.filter(R.propEq('hasInitValue', true), variables)
  // vlog('initVars.length', initVars.length);

  // Copy the list so we can mutate it and have the original list later.
  // This starts a queue of vars to examine. Referenced var will be added to the queue.
  let vars = R.map(v => v.copy(), initVars)
  // printVars(vars);
  // R.forEach(v => { console.error(v.refId); console.error(v.references); }, vars);

  // Keep track of which var ref ids are currently in the queue for faster lookup
  const queueRefIds = new Set()
  for (const v of vars) {
    queueRefIds.add(v.refId)
  }

  // Build a map of dependencies indexed by the lhs of each var.
  const depsMap = new Map()
  while (vars.length > 0) {
    let v = vars.pop()
    queueRefIds.delete(v.refId)
    // console.error(`- ${v.refId} (${vars.length})`);
    addDepsToMap(v)
  }

  function addDepsToMap(v) {
    // Add dependencies of var v to the map when they are not already present.
    // Use init references for vars such as levels that have an initial value.
    let refIds = v.hasInitValue ? v.initReferences : v.references
    // console.error(`${v.refId} ${refIds.length}`);
    if (refIds.length > 0) {
      // console.error(`${v.refId}`);
      // Add dependencies for each referenced var.
      depsMap.set(v.refId, refIds)
      // console.error(`→ ${v.refId}`);
      R.forEach(refId => {
        // Add each dependency onto the queue if it has not already been analyzed.
        if (!depsMap.get(refId)) {
          // console.error(refId);
          let refVar = varWithRefId(refId)
          if (refVar) {
            if (refVar.varType !== 'const' && !queueRefIds.has(refVar.refId)) {
              vars.push(refVar)
              queueRefIds.add(refVar.refId)
              // console.error(`+ ${refVar.refId}`);
            }
          } else {
            console.error(`no var with refId for ${refId}, referenced by ${v.refId}`)
          }
        }
      }, refIds)
    }
  }

  // Construct a dependency graph in the form of [var name, dependency var name] pairs.
  // We use refIds instead of vars here because the deps are stated in refIds.
  let graph = []
  // vlog('depsMap', depsMap);
  for (let refId of depsMap.keys()) {
    R.forEach(dep => graph.push([refId, dep]), depsMap.get(refId))
  }
  if (PRINT_INIT_GRAPH) printDepsGraph(graph, 'INIT')

  // Sort into a reference id dependency list.
  let deps = toposort(graph).reverse()

  // Turn the reference id list into a var list.
  let sortedVars = R.map(refId => varWithRefId(refId), deps)

  // Filter out vars with constant values.
  sortedVars = R.reject(
    R.propSatisfies(varType => varType === 'const' || varType === 'lookup' || varType === 'data', 'varType'),
    sortedVars
  )

  // Add the ref ids to a set for faster lookup in the next step
  const sortedVarRefIds = new Set()
  for (const v of sortedVars) {
    sortedVarRefIds.add(v.refId)
  }

  // Find vars with init values but no dependencies, and add them to the list.
  const nodepVars = R.filter(v => !sortedVarRefIds.has(v.refId), initVars)
  const sortedNodepVars = vsort(nodepVars)
  sortedVars = R.concat(sortedNodepVars, sortedVars)

  if (PRINT_SORTED_VARS) {
    sortedVars.forEach(v => console.error(`${v.refId}`))
  }
  return sortedVars
}
//
// Helpers for refIds
//
function refIdForVar(v) {
  // Start a reference id using the variable name.
  let refId = v.varName
  // References to apply-to-all arrays reference the entire array, so no subscripts
  // are required in the refId.
  if (v.hasSubscripts() && isNonAtoAName(v.varName)) {
    // Add subscripts already sorted in normal form for references to non-apply-to-all arrays.
    refId += `[${v.subscripts.join(',')}]`
  }
  return refId
}
//
// Helpers for model analysis
//
function printVarList() {
  // Print full information on each var.
  B.clearBuf()
  let vars = R.sortBy(R.prop('refId'), variables)
  for (const v of vars) {
    printVar(v)
  }
  return B.getBuf()
}
function yamlVarList() {
  // Print selected properties of all variable objects to a YAML string.
  let vars = R.sortBy(
    R.prop('refId'),
    R.map(v => filterVar(v), variables)
  )
  return yaml.safeDump(vars)
}
function printVar(v) {
  let nonAtoA = isNonAtoAName(v.varName) ? ' (non-apply-to-all)' : ''
  B.emitLine(`${v.modelLHS}: ${v.varType}${nonAtoA}`)
  if (!v.hasPoints()) {
    B.emitLine(`= ${v.modelFormula}`)
  }
  B.emitLine(`refId(${v.refId})`)
  if (v.hasSubscripts()) {
    B.emitLine(`families(${strlist(subscriptFamilies(v.subscripts))})`)
    B.emitLine(`subscripts(${strlist(v.subscripts)})`)
  }
  if (v.separationDims.length > 0) {
    B.emitLine(`separationDims(${strlist(v.separationDims)})`)
  }
  B.emitLine(`hasInitValue(${v.hasInitValue})`)
  if (v.references.length > 0) {
    B.emitLine(`refs(${strlist(v.references)})`)
  }
  if (v.initReferences.length > 0) {
    B.emitLine(`initRefs(${strlist(v.initReferences)})`)
  }
  // if (v.hasPoints()) {
  //   B.emitLine(R.map(p => `(${p[0]}, ${p[1]})`, v.points));
  // }
  B.emitLine('')
}
function filterVar(v) {
  let varObj = {}
  varObj.refId = v.refId
  varObj.varName = v.varName
  if (v.hasSubscripts()) {
    varObj.subscripts = v.subscripts
    varObj.families = subscriptFamilies(v.subscripts)
  }
  if (v.references.length > 0) {
    varObj.references = v.references
  }
  varObj.hasInitValue = v.hasInitValue
  if (v.initReferences.length > 0) {
    varObj.initReferences = v.initReferences
  }
  varObj.varType = v.varType
  if (v.separationDims.length > 0) {
    varObj.separationDims = v.separationDims
  }
  varObj.modelLHS = v.modelLHS
  varObj.modelFormula = v.modelFormula
  return varObj
}
function printRefIdTest() {
  // Verify that each variable has the correct number of instances of the var name.
  R.forEach(v => {
    let varName = v.varName
    let vars = varsWithName(varName)
    if (v.hasSubscripts()) {
      if (isNonAtoAName(varName)) {
        // A non-apply-to-all array has more than one instance of the var name in practice.
        if (vars.length < 2) {
          vlog('ERROR: only one instance of non-apply-to-all array', varName)
        }
      } else {
        // An apply-to-all array should have only one instance of the var name.
        if (vars.length > 1) {
          vlog('ERROR: more than one instance of apply-to-all array', varName)
          // printVars(vars)
        }
      }
    } else {
      // The var is a scalar and should only have one instance of the var name.
      if (vars.length > 1) {
        vlog('ERROR: more than one instance of scalar var', varName)
        // printVars(vars)
      }
    }
  }, variables)
  // Verify that each refId in references exists as the refId of a concrete variable.
  R.forEach(v => {
    R.forEach(refId => checkRefVar(refId), v.references)
    R.forEach(refId => checkRefVar(refId), v.initReferences)
  }, variables)
  function checkRefVar(refId) {
    let refVar = R.find(R.propEq('refId', refId), variables)
    if (!refVar) {
      vlog('ERROR: no var for refId', refId)
    }
  }
}
function printRefGraph(varName) {
  // Walk the reference tree rooted at varName and print it out in indented form.
  let printRefs = (v, indent, stack) => {
    for (let refId of v.references) {
      // Exclude a variable here to limit the depth of the search.
      // if (!refId.startsWith('_policy_levels')) {
      if (!stack.includes(refId)) {
        console.log(`${'  '.repeat(indent)}${refId}`)
        let refVar = R.find(R.propEq('refId', refId), variables)
        printRefs(refVar, indent + 1, R.append(refId, stack))
      }
      // }
    }
  }
  for (let v of varsWithName(varName)) {
    console.log(v.varName)
    printRefs(v, 1, [])
  }
}
function printDepsGraph(graph, varType) {
  // The dependency graph is an array of pairs.
  console.error(`${varType} GRAPH`)
  for (const dep of graph) {
    console.error(`${dep[0]} → ${dep[1]}`)
  }
}

function allListedVars() {
  // Put variables into the order that they are evaluated by SDE in the generated model
  const listedVars = []
  const visitedRefIds = new Set()
  function addUnique(vars) {
    for (const v of vars) {
      // Skip variables that have already been visited
      if (visitedRefIds.has(v.refId)) {
        continue
      }
      visitedRefIds.add(v.refId)

      // Filter out variables that are generated/used internally
      if (v.includeInOutput === false) {
        continue
      }

      // Include the variable
      listedVars.push(v)
    }
  }

  // The order of execution/evaluation in the generated model is:
  //   initConstants (vars of type `const` only)
  //   initLookups (vars of type `lookup` only)
  //   initData (vars of type `data` only)
  //   initLevels (vars returned by `initVars`, a mix of initial, aux, and level vars)
  //   evalAux (vars of type `aux` only)
  //   evalLevels (vars of type `level` only)
  // So to make the ordering in the listing better match the order of evaluation,
  // we emit variables in the above order, but filter to avoid having duplicates.
  addUnique(constVars())
  addUnique(lookupVars())
  addUnique(dataVars())
  // The special exogenous `Time` variable may have already been removed by
  // `removeUnusedVariables` if it is not referenced explicitly in the model,
  // so we will only include it in the listing if it is defined here.  Note
  // that `_time` is set to `_initial_time` as the first step in the
  // `initLevels` function, which is why it is included here.
  const timeVar = varWithName('_time')
  if (timeVar) {
    addUnique([timeVar])
  }
  addUnique(initVars())
  addUnique(auxVars())
  addUnique(levelVars())

  return listedVars
}

function filteredListedVars() {
  // Extract a subset of the available info for each variable and sort all variables
  // according to the order that they are evaluated by SDE in the generated model
  return R.map(v => filterVar(v), allListedVars())
}

function varIndexInfoMap() {
  // Return a map containing information for each listed variable:
  //   varName
  //   varType
  //   varIndex
  //   subscriptCount

  // Get the filtered variables in the order that they are evaluated by SDE in the
  // generated model
  const sortedVars = filteredListedVars()

  // Get the set of unique variable names, and assign a 1-based index to each.
  // This matches the index number used in `storeOutput` and `setLookup` in the
  // generated C/JS code
  const infoMap = new Map()
  let varIndex = 1
  for (const v of sortedVars) {
    const varName = v.varName
    if (!infoMap.get(varName)) {
      infoMap.set(varName, {
        varName,
        varType: v.varType,
        varIndex,
        subscriptCount: v.families ? v.families.length : 0
      })
      varIndex++
    }
  }

  return infoMap
}

function varIndexInfo() {
  // Return an array, sorted by `varName`, containing information for each
  // listed variable:
  //   varName
  //   varType
  //   varIndex
  //   subscriptCount
  if (cachedVarIndexInfo) {
    return cachedVarIndexInfo
  }
  cachedVarIndexInfo = Array.from(varIndexInfoMap().values())
  return cachedVarIndexInfo
}

function jsonList() {
  // Return an object containing variable and subscript information for the model
  // that will be used to write the JSON model listing files.
  if (cachedJsonList) {
    return cachedJsonList
  }

  // Get the set of available subscripts
  const allDims = [...allDimensions()]
  const sortedFullDims = allDims.sort((a, b) => a.name.localeCompare(b.name))

  // Extract a subset of the available info for each variable and put them in eval order
  const sortedFullVars = filteredListedVars()

  // Assign a 1-based index for each variable that has data that can be accessed.
  // This matches the index number used in `storeOutput` and `setLookup` in the
  // generated C/JS code
  const infoMap = varIndexInfoMap()
  for (const v of sortedFullVars) {
    const varInfo = infoMap.get(v.varName)
    if (varInfo) {
      v.varIndex = varInfo.varIndex
    }
  }

  // Derive minimal versions of the full arrays; these only contain the minimal
  // subset of fields that are needed by the `ModelListing` class from the
  // runtime package.  The property names in the minimal objects are slightly
  // different than the full ones to better match the latest naming used in the
  // compile and runtime packages.
  const sortedMinimalDims = sortedFullDims.map(d => {
    return {
      id: d.name,
      subIds: d.value
    }
  })

  // Note that `sortedFullVars` may contain duplicates in the case of separated
  // variables, but for the minimal listing we only want to have one entry per
  // index (i.e., one entry for each base variable ID), so we filter out the
  // duplicates here.
  const baseIds = new Set()
  const sortedMinimalVars = []
  for (const v of sortedFullVars) {
    const baseId = v.varName
    if (!baseIds.has(baseId)) {
      baseIds.add(baseId)

      const varInfo = {}
      varInfo.id = baseId
      if (v.families) {
        varInfo.dimIds = v.families
      }
      varInfo.index = v.varIndex
      sortedMinimalVars.push(varInfo)
    }
  }

  cachedJsonList = {
    full: {
      dimensions: sortedFullDims,
      variables: sortedFullVars
    },
    minimal: {
      dimensions: sortedMinimalDims,
      variables: sortedMinimalVars
    }
  }
  return cachedJsonList
}

export default {
  addConstantExpr,
  addNonAtoAVar,
  addVariable,
  allVars,
  auxVars,
  cName,
  constVars,
  dataVars,
  expansionFlags,
  filterVar,
  getConstantExprValue,
  initVars,
  isInputVar,
  isNonAtoAName,
  jsonList,
  levelVars,
  lookupVars,
  printRefGraph,
  printRefIdTest,
  printVarList,
  read,
  refIdForVar,
  refIdsWithName,
  resetModelState,
  splitRefId,
  variables,
  varIndexInfo,
  varNames,
  varsWithName,
  varWithName,
  varWithRefId,
  vensimName,
  yamlVarList
}
