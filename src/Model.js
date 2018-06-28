const antlr4 = require('antlr4/index')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const R = require('ramda')
const { Digraph, TopologicalOrder } = require('digraph-sort')
const VariableReader = require('./VariableReader')
const VarNameReader = require('./VarNameReader')
const SubscriptRangeReader = require('./SubscriptRangeReader')
const Variable = require('./Variable')
const {
  addIndex,
  allDimensions,
  dimensionNames,
  indexNames,
  indexNamesForSubscript,
  isDimension,
  isIndex,
  sub,
  Subscript,
  subscriptFamilies
} = require('./Subscript')
const {
  decanonicalize,
  isAlpha,
  isDigit,
  isIterable,
  listConcat,
  printEqn,
  strlist,
  vlog,
  vsort
} = require('./Helpers')

let variables = []
let nonAtoANames = Object.create(null)
// Set true for diagnostic printing of init, aux, and level vars in sorted order.
const PRINT_SORTED_VARS = false

function read(parseTree, spec, extData) {
  // Some arrays need to be separated into variables with individual indices to
  // prevent eval cycles. They are manually added to the spec file.
  let specialSeparationDims = spec.specialSeparationDims
  // Subscript ranges must be defined before reading variables that use them.
  readSubscriptRanges(parseTree)
  // Read variables from the model parse tree.
  readVariables(parseTree, specialSeparationDims)
  // Analyze model equations to fill in more details about variables.
  analyze()
  // Check that all input and output vars in the spec actually exist in the model.
  checkSpecVars(spec, extData)
}
function readSubscriptRanges(tree) {
  // Read subscript ranges from the model.
  let subscriptRangeReader = new SubscriptRangeReader()
  subscriptRangeReader.visitModel(tree)
  let allDims = allDimensions()

  // Expand dimensions that appeared in subscript range definitions into indices.
  // Repeat until there are only indices in dimension values.
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
    // Take the first index in the dimension.
    let index = dim.value[0]
    // Find the dimension in this family with the largest number of values.
    // This is the "maximal" dimension that serves as the subscript family.
    // If two dimensions have the same maximal size, choose the one that comes
    // first in alpha sort order, by convention.
    let familyDims = R.sort(dimComparator, R.filter(thisDim => R.contains(index, thisDim.value), allDims))
    if (familyDims.length > 0) {
      dim.family = R.last(familyDims).name
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
      let mappingValue = fromDim.mappings[toDimName]
      if (R.isEmpty(mappingValue)) {
        // When there is no list of map-to subscripts, list fromDim indices.
        fromDim.mappings[toDimName] = fromDim.value
      } else {
        // The mapping value is a list of map-to subscripts.
        // List fromDim indices in the order in which they map onto toDim indices.
        // Indices are filled in the mapping value by map-to index number as they
        // occur in the map-from dimension.
        let mv = []
        for (let i = 0; i < fromDim.value.length; i++) {
          let fromIndName = fromDim.value[i]
          let toSubName = mappingValue[i]
          let toSub = sub(toSubName)
          if (isDimension(toSubName)) {
            // Fill in indices from a dimension in the mapping value.
            for (let toIndName of toSub.value) {
              let toIndNumber = sub(toIndName).value
              mv[toIndNumber] = fromIndName
            }
          } else {
            // Fill in a single index from an index in the mapping value.
            try {
              let toIndNumber = toSub.value
              mv[toIndNumber] = fromIndName
            } catch (e) {
              console.error(
                `ERROR: map-to index "${toSubName}" not found when mapping from dimension "${
                  fromDim.name
                }" index "${fromIndName}"`
              )
            }
          }
        }
        fromDim.mappings[toDimName] = mv
      }
    }
  }
}
function readVariables(tree, specialSeparationDims) {
  // Read all variables in the model parse tree.
  // This populates the variables table with basic information for each variable
  // such as the var name and subscripts.
  let variableReader = new VariableReader(specialSeparationDims)
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
function checkSpecVars(spec, extData) {
  // Look up each var in the spec and issue and error message if it does not exist.
  function check(varNames, specType) {
    if (isIterable(varNames)) {
      for (let varName of varNames) {
        // TODO handle mismatch of subscripted variables having numerical indices in the spec
        if (!R.contains('[', varName)) {
          if (!R.find(R.propEq('refId', varName), variables)) {
            // Look for a variable in external data.
            if (extData.has(varName)) {
              // console.error(`found ${specType} ${varName} in extData`)
              // Copy data from an external file to an equation that does a lookup.
              let lookup = R.reduce(
                (a, p) => listConcat(a, `(${p[0]}, ${p[1]})`, true),
                '',
                Array.from(extData.get(varName))
              )
              let modelEquation = `${decanonicalize(varName)} = WITH LOOKUP(Time, (${lookup}))`
              addEquation(modelEquation)
            } else {
              console.error(`data variable ${varName} not found in external data sources`)
            }
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
function addEquation(modelEquation) {
  // Add an equation in Vensim model format.
  const EquationReader = require('./EquationReader')
  let chars = new antlr4.InputStream(modelEquation)
  let lexer = new ModelLexer(chars)
  let tokens = new antlr4.CommonTokenStream(lexer)
  let parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  let tree = parser.equation()
  // Read the var and add it to the Model var table.
  let variableReader = new VariableReader()
  variableReader.visitEquation(tree)
  let v = variableReader.var
  // Fill in the refId.
  v.refId = refIdForVar(v)
  // Finish the variable by parsing the RHS.
  let equationReader = new EquationReader(v)
  equationReader.read()
}
function removeConstRefs() {
  // Remove references to const, data, and lookup vars since they do not affect evaluation order.
  function refIsConst(refId) {
    let v = varWithRefId(refId)
    return v && (v.varType === 'const' || v.varType === 'data' || v.varType === 'lookup')
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
function dataVars() {
  return vsort(varsOfType('data'))
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
    debugger
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
function vensimName(cVarName) {
  // Convert a C variable name to a Vensim name.
  let result = cVarName
  // Get the variable name and subscripts with regexes.
  let m = cVarName.match(/(_[A-Za-z0-9_]+)(\[\d+\])?(\[\d+\])?/)
  if (m) {
    let varName = m[1]
    let indexNumbers = []
    if (m[2]) {
      indexNumbers.push(m[2].replace('[', '').replace(']', ''))
      if (m[3]) {
        indexNumbers.push(m[3].replace('[', '').replace(']', ''))
      }
    }
    // Get the subscript families and look up the subscript names.
    let subscripts = ''
    let v = varWithName(varName)
    if (v) {
      m = v.modelLHS.match(/[^\[]+/)
      if (m) {
        varName = m[0]
      }
      let families = subscriptFamilies(v.subscripts)
      for (var i = 0; i < families.length; i++) {
        let indexNames = indexNamesForSubscript(families[i])
        let indexNumber = Number.parseInt(indexNumbers[i])
        let indexModelName = decanonicalize(indexNames[indexNumber])
        subscripts += `[${indexModelName}]`
      }
      result = varName + subscripts
    }
  }
  return result
}
function cName(vensimVarName) {
  // Convert a Vensim variable name to a C name.
  // This function requires model analysis to be completed first when the variable has subscripts.
  return new VarNameReader().read(vensimVarName)
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
        return [ref, v]
      } else {
        return [v, ref]
      }
    }, refs)
  }
  let graph = new Digraph()
  R.forEach(v => {
    R.forEach(edge => graph.addEdge(edge[0], edge[1]), refs(v))
  }, vars)
  // Sort into an lhs dependency list.
  let depVars = new TopologicalOrder(graph).dependencyOrder()
  // Find vars of the given varType with no dependencies, and add them to the list.
  let nodepVars = vsort(R.filter(v => !R.contains(v, depVars), vars))
  let sortedVars = R.concat(nodepVars, depVars)
  if (PRINT_SORTED_VARS) {
    sortedVars.forEach((v, i) => console.error(`${v.refId}`))
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
  // We use refIds instead of vars here because the deps are stated in refIds.
  let graph = new Digraph()
  // vlog('depsMap', depsMap);
  for (let refId of depsMap.keys()) {
    R.forEach(dep => graph.addEdge(refId, dep), depsMap.get(refId))
  }
  // console.error(graph.toString())
  // Sort into a reference id dependency list.
  let deps = new TopologicalOrder(graph).dependencyOrder()
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
          printVars(vars)
        }
      }
    } else {
      // The var is a scalar and should only have one instance of the var name.
      if (vars.length > 1) {
        vlog('ERROR: more than one instance of scalar var', varName)
        printVars(vars)
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

module.exports = {
  addEquation,
  addVariable,
  allVars,
  auxVars,
  cName,
  constVars,
  dataVars,
  expansionFlags,
  initVars,
  isNonAtoAName,
  levelVars,
  lookupVars,
  printRefGraph,
  printRefIdTest,
  printVarList,
  read,
  refIdForVar,
  variables,
  varNames,
  varsWithName,
  varWithName,
  varWithRefId,
  vensimName
}
