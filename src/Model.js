const R = require('ramda')
const toposort = require('./toposort')
const VariableReader = require('./VariableReader')
const SubscriptRangeReader = require('./SubscriptRangeReader')
const Variable = require('./Variable')
const Model = require('./Model')
const {
  addIndex,
  allDimensions,
  dimensionNames,
  indexNames,
  isDimension,
  isIndex,
  sub,
  Subscript,
  subscriptFamilies
} = require('./Subscript')
const { printEqn, vsort, listVars, list, strlist, vlog } = require('./Helpers')

let variables = []
let nonAtoANames = Object.create(null)
// Set true for diagnostic printing of init, aux, and level vars in sorted order.
const PRINT_SORTED_VARS = false

function readSubscriptRanges(tree) {
  // Read subscript ranges from the model.
  let subscriptRangeReader = new SubscriptRangeReader()
  subscriptRangeReader.visitModel(tree)
  let allDims = allDimensions()
  // Expand subdimensions that appeared in subscript ranges and mappings into indices.
  // Repeat until there are no dimensions in values.
  let dimFoundInValue
  do {
    dimFoundInValue = false
    for (let dim of allDims) {
      let value = R.flatten(R.map(subscript => (isDimension(subscript) ? sub(subscript).value : subscript), dim.value))
      if (!R.equals(value, dim.value)) {
        dimFoundInValue = true
        dim.value = value
        dim.size = value.length
      }
    }
  } while (dimFoundInValue)
  // Update the families of subdimensions.
  // At this point, all dimensions have their family set to their own dimension name.
  // List the number of values for each dimension.
  for (let dim of allDims) {
    // Take the first index in the dimension.
    let index = dim.value[0]
    // Find the dimension in this family with the largest number of values.
    // This is the "maximal" dimension that serves as the subscript family.
    let maxSize = dim.value.length
    for (let thisDim of allDims) {
      if (R.contains(index, thisDim.value) && thisDim.value.length > maxSize) {
        dim.family = thisDim.name
        maxSize = thisDim.value.length
      }
    }
  }
  // Define indices in order from the maximal (family) dimension.
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
      let mappingValue = fromDim.mappings[toDimName]
      if (R.isEmpty(mappingValue)) {
        // When there is no list of map-to subscripts, list fromDim indices.
        fromDim.mappings[toDimName] = fromDim.value
      } else {
        // The mapping value is a list of map-to subscripts.
        // List fromDim indices in the order in which they map onto toDim indices.
        let mv = []
        for (let i = 0; i < fromDim.value.length; i++) {
          let fromIndName = fromDim.value[i]
          let toSubName = mappingValue[i]
          let toSub = sub(toSubName)
          if (isDimension(toSubName)) {
            for (let toIndName of toSub.value) {
              mv[sub(toIndName).value] = fromIndName
            }
          } else {
            mv[toSub.value] = fromIndName
          }
        }
        fromDim.mappings[toDimName] = mv
      }
    }
  }
}
function readVariables(tree) {
  // Read all variables in the model parse tree.
  // This populates the variables table with basic information for each variable
  // such as the var name and subscripts.
  let variableReader = new VariableReader()
  variableReader.visitModel(tree)
  // Add a placeholder variable for the exogenous variable Time.
  let v = new Variable(null)
  v.modelLHS = 'Time'
  v.varName = '_time'
  addVariable(v)
}
function analyze() {
  // Analyze the RHS of each equation in stages after all the variables are read.
  // Find non-apply-to-all vars that are defined with more than one equation.
  findNonAtoAVars()
  // Set the refId for each variable. Only non-apply-to-all vars include subscripts in the refId.
  setRefIds()
  // Read the RHS to list the refIds of vars that are referenced and set the var type.
  readEquations()
  // Remove constants from references now that all var types are determined.
  removeConstRefs()
}
//
// Analysis helpers
//
function findNonAtoAVars() {
  // Find variables with multiple instances with the same var name, which makes them
  // elements in a non-apply-to-all array. This function constructs the nonAtoANames list.
  let names = varNames()
  function areSubsEqual(vars, i) {
    // Scan the subscripts for each var at position i in normal order.
    // Return true if the subscript is the same for all vars with that name.
    let subscript = vars[0].subscripts[i]
    for (let v of vars) {
      if (v.subscripts[i] != subscript) {
        return false
      }
    }
    return true
  }
  R.forEach(name => {
    let vars = varsWithName(name)
    if (vars.length > 1) {
      // This is a non-apply-to-all array. Construct the exansion dims array for it.
      // The expansion dim is true at each dim position where the subscript varies.
      let numDims = vars[0].subscripts.length
      let expansionDims = []
      for (var i = 0; i < numDims; i++) {
        expansionDims[i] = !areSubsEqual(vars, i)
      }
      nonAtoANames[name] = expansionDims
    }
  }, varNames())
}
function setRefIds() {
  // Set the refId for each var. This requires knowing which vars are non-apply-to-all.
  R.forEach(v => {
    v.refId = refIdForVar(v)
  }, variables)
}
function readEquations() {
  // Augment variables with information from their equations.
  // This requires a refId for each var so that actual refIds can be resolved for the reference list.
  const EquationReader = require('./EquationReader')
  R.forEach(v => {
    let equationReader = new EquationReader(v)
    equationReader.read()
  }, variables)
}
function removeConstRefs() {
  // Remove references to const vars since they do not affect evaluation order.
  function refIsConst(refId) {
    let v = varWithRefId(refId)
    return v && v.varType === 'const'
  }
  R.forEach(v => {
    v.references = R.reject(refIsConst, v.references)
    v.initReferences = R.reject(refIsConst, v.initReferences)
  }, variables)
}
function printVar(v) {
  let nonAtoA = isNonAtoAName(v.varName) ? ' (non-apply-to-all)' : ''
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
//
// Model API
//
function addVariable(v) {
  // Add the variable to the variables list.
  variables.push(v)
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
function constVars() {
  return vsort(varsOfType('const'))
}
function lookupVars() {
  return vsort(varsOfType('lookup'))
}
function auxVars() {
  // console.error('AUX VARS');
  return sortVarsOfType('aux')
}
function levelVars() {
  // console.error('LEVEL VARS');
  return sortVarsOfType('level')
}
function initVars() {
  // console.error('INIT VARS');
  return sortInitVars()
}
function varWithRefId(refId) {
  // Find a variable from a reference id.
  // A direct reference will find scalar vars, apply-to-all arrays, and non-apply-to-all array
  // elements defined by individual index.
  let refVar = R.find(R.propEq('refId', refId), variables)
  if (!refVar) {
    // Try replacing indices in the refId with dimensions.
    // This covers the case were a non-apply-to-all array is referenced by an
    // individual index, but the array element is defined as part of a subdimension.
    // TODO support more than one index in the [ind,ind] case
    let refIdParts = splitRefId(refId)
    if (refIdParts.subs.length > 0) {
      for (let [i, subscript] of refIdParts.subs.entries()) {
        if (isIndex(subscript)) {
          // Find a dimension containing the index.
          for (let dim of allDimensions()) {
            if (R.contains(subscript, dim.value)) {
              // More than one dimension might contain the index, but the variable will only
              // be defined with one particular dimension, so there is no confusion.
              let testRefIdParts = R.clone(refIdParts)
              testRefIdParts.subs[i] = dim.name
              let testRefId = joinRefId(testRefIdParts)
              // vlog('trying testRefId', testRefId);
              refVar = R.find(R.propEq('refId', testRefId), variables)
              if (refVar) {
                // console.error(`substituting ${refVar.refId} for ${refId}`);
                return refVar
              }
            }
          }
        }
      }
    }
    vlog('ERROR: no var found for refId', refId)
  }
  return refVar
}
function varWithName(varName) {
  // Find a variable with the given name in canonical form.
  // The function returns the first instance of a non-apply-to-all variable with the name.
  let v = R.find(R.propEq('varName', varName), variables)
  return v
}
function varsWithName(varName) {
  // Find all variables with the given name in canonical form.
  let vars = R.filter(R.propEq('varName', varName), variables)
  return vars
}
function varNames() {
  // Return a sorted list of var names.
  return R.uniq(R.map(v => v.varName, variables)).sort()
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
  let deps = toposort(graph).reverse()
  // Turn the dependency-sorted var name list into a var list.
  let sortedVars = varsOfType(varType, R.map(refId => varWithRefId(refId), deps))
  // Find vars of the given varType with no dependencies, and add them to the list.
  let nodepVars = vsort(R.filter(v => !R.contains(v, sortedVars), vars))
  sortedVars = R.concat(nodepVars, sortedVars)
  if (PRINT_SORTED_VARS) {
    sortedVars.forEach((v, i) => console.error(`${v.refId}`))
    // sortedVars.forEach((v, i) => console.error(`${v.refId}\t${i}`));
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
  let vars = R.map(v => v.copy(), initVars)
  // listVars(vars);
  // R.forEach(v => { console.error(v.refId); console.error(v.references); }, vars);
  // Build a map of dependencies indexed by the lhs of each var.
  let depsMap = new Map()
  while (vars.length > 0) {
    let v = vars.pop()
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
            if (refVar.varType != 'const' && !R.contains(refVar, vars)) {
              vars.push(refVar)
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
  let graph = []
  // vlog('depsMap', depsMap);
  for (let refId of depsMap.keys()) {
    R.forEach(dep => graph.push([refId, dep]), depsMap.get(refId))
  }
  // console.error(graph);
  // Sort into a reference id dependency list.
  let deps = toposort(graph).reverse()
  // return [];
  // Turn the reference id list into a var list.
  let sortedVars = R.map(refId => varWithRefId(refId), deps)
  // Filter out vars with constant values.
  sortedVars = R.reject(R.propSatisfies(varType => varType === 'const' || varType === 'lookup', 'varType'), sortedVars)
  // Find vars with init values but no dependencies, and add them to the list.
  let nodepVars = vsort(R.filter(v => !R.contains(v, sortedVars), initVars))
  sortedVars = R.concat(nodepVars, sortedVars)
  if (PRINT_SORTED_VARS) {
    sortedVars.forEach((v, i) => console.error(`${v.refId}`))
    // sortedVars.forEach((v, i) => console.error(`${v.refId}\t${i}`));
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
function splitRefId(refId) {
  // Split a refId into component parts with a regular expression matching var name and subscripts.
  let re = /\w+|\[/g
  let inSubs = false
  let varName = ''
  let subs = []
  let m
  while ((m = re.exec(refId))) {
    if (m[0] === '[') {
      inSubs = true
    } else if (inSubs) {
      subs.push(m[0])
    } else {
      varName = m[0]
    }
  }
  return { refId: refId, varName: varName, subs: subs, dims: dimensionNames(subs), inds: indexNames(subs) }
}
function joinRefId(refIdParts) {
  // Joing a refIdParts structure created by splitRefId back into a refId.
  let refId = refIdParts.varName
  if (refIdParts.subs.length > 0) {
    refId += `[${refIdParts.subs.join(',')}]`
  }
  return refId
}
//
// Helpers for model analysis
//
function printVarList() {
  // Print full information on each var.
  R.forEach(v => printVar(v), variables)
  // Print the var name only.
  // R.forEach(v => console.log(v.modelLHS), variables);
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
          listVars(vars)
        }
      }
    } else {
      // The var is a scalar and should only have one instance of the var name.
      if (vars.length > 1) {
        vlog('ERROR: more than one instance of scalar var', varName)
        listVars(vars)
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

module.exports = {
  variables,
  readVariables,
  readSubscriptRanges,
  analyze,
  addVariable,
  isNonAtoAName,
  expansionFlags,
  allVars,
  constVars,
  lookupVars,
  auxVars,
  levelVars,
  initVars,
  varWithRefId,
  varWithName,
  varsWithName,
  varNames,
  refIdForVar,
  printVarList,
  printRefIdTest
}
