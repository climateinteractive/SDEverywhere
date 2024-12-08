import { hasMapping, isDimension, isIndex, isTrivialDimension, sub } from '../_shared/subscript.js'
import { generateConstListElement } from './gen-const-list.js'

import { generateDirectConstInit } from './gen-direct-const.js'
import { generateExpr } from './gen-expr.js'
import { generateLookupsFromDirectData } from './gen-lookup-from-direct.js'
import { generateLookupsFromExternalData } from './gen-lookup-from-external.js'
import { generateLookupFromPoints } from './gen-lookup-from-points.js'

import LoopIndexVars from './loop-index-vars.js'

const loopIndexVarNames = ['i', 'j', 'k', 'l', 'm']
const arrayIndexVarNames = ['u', 'v', 'w', 's', 't', 'f', 'g', 'h', 'o', 'p', 'q', 'r']

/**
 * Generate C code for the given model equation.
 *
 * TODO: Variable type
 * TODO: Define type for mode values
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-constants' | 'init-lookups' | 'init-levels' | 'eval'} mode The code generation mode.
 * @param {Map<string, any>} extData The map of datasets from external `.dat` files.
 * @param {Map<string, any>} directData The mapping of dataset name used in a `GET DIRECT DATA` call (e.g.,
 * `?data`) to the tabular data contained in the loaded data file.
 * @param {string} modelDir The path to the directory containing the model (used for resolving data files).
 * @param {'c' | 'js'} outFormat The output format.
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateEquation(variable, mode, extData, directData, modelDir, outFormat) {
  // Maps of LHS subscript families to loop index vars for lookup on the RHS
  const loopIndexVars = new LoopIndexVars(loopIndexVarNames)
  const arrayIndexVars = new LoopIndexVars(arrayIndexVarNames)

  // Make the generated loops easier to follow by eagerly determining the order of index
  // variables based on the order of the LHS dimension names.  For example, if we have:
  //   x[DimA, DimC, DimB] = y[DimB, DimC, DimA] ~~|
  // This will generate loop index variable mappings in the following order:
  //   DimA -> i
  //   DimC -> j
  //   DimB -> k
  const lhsDimIds = variable.subscripts.filter(isDimension)
  for (const lhsDimId of lhsDimIds) {
    // We ignore the return value here.  Calling `index` will make `LoopIndexVars` eagerly
    // set up a mapping from the dimension ID to the loop index variable name.
    loopIndexVars.index(lhsDimId)
  }

  // Generate the LHS variable reference code
  const parsedEqn = variable.parsedEqn
  const cLhs = cVarRefWithLhsSubscripts(variable, parsedEqn.lhs.varDef.varId, loopIndexVars)

  // Include the original model equation in a comment that comes before the generated code
  // for that equation
  const modelFormula = variable.origModelFormula || variable.modelFormula
  const comment = `  // ${variable.modelLHS} = ${modelFormula.replace(/\n/g, '')}`

  // Apply special handling for const lists
  if (parsedEqn.rhs.kind === 'const-list') {
    if (mode !== 'init-constants' && mode !== 'eval') {
      throw new Error(`Invalid code gen mode '${mode}' for const list variable ${variable.modelLHS}`)
    }
    // XXX: The legacy code gen emitted a comment before each init statement, so we will
    // do the same for now to maintain compatibility
    return [comment, generateConstListElement(variable, parsedEqn)]
  }

  // Emit direct constants individually without separating them first
  if (variable.directConstArgs) {
    const initCode = generateDirectConstInit(variable, directData, modelDir)
    return [comment, ...initCode]
  }

  // Turn each dimension ID into a loop with a loop index variable.
  // If the variable has no subscripts, nothing will be emitted here.
  const indexDecl = outFormat === 'js' ? 'let' : 'size_t'
  const openLoops = []
  const closeLoops = []
  for (const lhsDimId of lhsDimIds) {
    const indexName = loopIndexVars.index(lhsDimId)
    const dimLength = sub(lhsDimId).size
    openLoops.push(`  for (${indexDecl} ${indexName} = 0; ${indexName} < ${dimLength}; ${indexName}++) {`)
    closeLoops.push('  }')
  }

  // Apply special handling for data variables.  The data can be defined in one of three ways:
  //   - as a set of explicit data points (stored in the `Variable` instance), or
  //   - from an external file via a `GET DIRECT DATA` call, or
  //   - from an external data file (i.e., a "normal" data variable)
  if (variable.isData()) {
    if (variable.points.length > 0) {
      // The variable already has data points defined, so generate a new lookup using that data.
      // Note that unlike the other lookup cases, this one needs to include loop open/close code
      // if the variable is subscripted.
      const lookupDef = generateLookupFromPoints(variable, mode, /*copy=*/ true, cLhs, loopIndexVars, outFormat)
      if (lookupDef.length > 0) {
        return [comment, ...openLoops, ...lookupDef, ...closeLoops]
      } else {
        return []
      }
    } else if (variable.directDataArgs) {
      // The data is referenced using a `GET DIRECT DATA` call; generate one or more lookups
      // using the data defined in external files
      return generateLookupsFromDirectData(variable, mode, directData, modelDir, cLhs, outFormat)
    } else {
      // This is a "normal" data variable; generate one or more lookups using the data defined
      // in external files
      return generateLookupsFromExternalData(variable, mode, extData, cLhs, outFormat)
    }
  }

  // Apply special handling for lookup variables.  The data for lookup variables is already
  // defined as a set of explicit data points (stored in the `Variable` instance).
  if (variable.isLookup()) {
    if (variable.varSubtype === 'gameInputs') {
      // For a synthesized game inputs lookup, there is no data array (the data is expected
      // to be supplied at runtime), so don't emit decl or init code for these
      return []
    } else {
      // For all other lookups, emit decl/init code for the lookup
      return generateLookupFromPoints(variable, mode, /*copy=*/ false, cLhs, loopIndexVars, outFormat)
    }
  }

  // Keep a buffer of code that will be included before the innermost loop
  const preInnerLoopLines = []

  // Keep a buffer of code that will be included before the generated primary formula
  const preFormulaLines = []

  // Keep a buffer of code that will be included after the generated primary formula
  const postFormulaLines = []

  // Generate code for an equation with an expression on the RHS
  const genExprCtx = {
    variable,
    mode,
    outFormat,
    cLhs,
    loopIndexVars,
    arrayIndexVars,
    emitPreInnerLoop: s => preInnerLoopLines.push(s),
    emitPreFormula: s => preFormulaLines.push(s),
    emitPostFormula: s => postFormulaLines.push(s),
    cVarRef: varRef => cVarRef(variable, varRef, loopIndexVars, arrayIndexVars),
    cVarRefWithLhsSubscripts: baseVarId => cVarRefWithLhsSubscripts(variable, baseVarId, loopIndexVars),
    cVarIndex: subOrDimId => cVarIndex(variable, subOrDimId, loopIndexVars, arrayIndexVars)
  }
  const cRhs = generateExpr(parsedEqn.rhs.expr, genExprCtx)
  const formula = `  ${cLhs} = ${cRhs};`

  // Insert the pre-inner loop code, if needed
  if (preInnerLoopLines.length > 0) {
    openLoops.splice(variable.subscripts.length - 1, 0, ...preInnerLoopLines)
  }

  // Combine all lines of comments and code into a single array
  return [comment, ...openLoops, ...preFormulaLines, formula, ...postFormulaLines, ...closeLoops]
}

/**
 * Return the C code for a subscripted reference to the given variable using the LHS subscripts
 * of the given equation.
 *
 * @param {*} lhsVariable The LHS `Variable` instance.
 * @param {*} baseVarId The base variable ID to which the subscript parts will be appended.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string} The C variable reference.
 */
function cVarRefWithLhsSubscripts(lhsVariable, baseVarId, loopIndexVars) {
  const lhsSubIds = lhsVariable.subscripts
  const cSubParts = lhsSubIds.map(subId => {
    if (isDimension(subId)) {
      const i = loopIndexVars.index(subId)
      if (isTrivialDimension(subId)) {
        // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
        return `[${i}]`
      } else {
        // Otherwise, emit e.g. `[_dim[i]]`
        return `[${subId}[${i}]]`
      }
    } else {
      // This is a specific subscript (i.e., an index); dereference the array using the index
      // number of the subscript
      return `[${sub(subId).value}]`
    }
  })
  return `${baseVarId}${cSubParts.join('')}`
}

/**
 * Return the C code for a RHS (possibly subscripted) variable reference.
 *
 * @param {*} lhsVariable The LHS `Variable` instance.
 * @param {*} rhsVarRef The `VariableRef` used in a RHS expression.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions
 * (that use marked dimensions).
 * @returns {string} The C variable reference.
 */
function cVarRef(lhsVariable, rhsVarRef, loopIndexVars, arrayIndexVars) {
  if (rhsVarRef.subscriptRefs === undefined) {
    // No subscripts, so return the base variable ID
    return rhsVarRef.varId
  }

  // Get the RHS subscript IDs.  Note that we leave the "!" in place in the case of
  // marked dimensions; they will be handled specially in `cVarIndex`.
  const rhsSubIds = rhsVarRef.subscriptRefs.map(subRef => subRef.subId)

  // Determine the subscript code (array lookup) for each dimension.  For example, if
  // the RHS variable reference in the model looks like `x[DimA]`, this will convert the
  // `[DimA]` part to `[_dima[i]]` (or simply `[i]` if it is a "trivial" dimension).
  const cSubParts = rhsSubIds.map(rhsSubId => {
    return cVarIndex(lhsVariable, rhsSubId, loopIndexVars, arrayIndexVars)
  })

  return `${rhsVarRef.varId}${cSubParts.map(part => `[${part}]`).join('')}`
}

/**
 * Return the C code for indexing into a subscripted variable.
 *
 * @param {*} lhsVariable The LHS `Variable` instance.
 * @param {string} rhsSubId The specific subscript or dimension ID being evaluated.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions
 * (that use marked dimensions).
 * @returns {string} The C variable reference.
 */
function cVarIndex(lhsVariable, rhsSubId, loopIndexVars, arrayIndexVars) {
  // NOTE: The code in this function follows basically the same steps that are used in
  // the `resolveRhsSubOrDim` function in the `readEquation` phase.
  // TODO: Since these two functions are so similar, it would be better to write a
  // single function that has the common logic, and then write a wrapper function
  // that converts the resulting subscript or dimension ID to an index

  // Helper function that returns either `indexVarName` or `dimId[indexVarName]` depending
  // on whether `dimId` is considered "trivial".
  function optimalIndex(indexVars, dimId) {
    const indexVarName = indexVars.index(dimId)
    if (isTrivialDimension(dimId)) {
      // When the dimension is trivial, we can emit e.g. `[i]` instead of `[_dim[i]]`
      return `${indexVarName}`
    } else {
      // Otherwise, emit e.g. `[_dim[i]]`
      return `${dimId}[${indexVarName}]`
    }
  }

  if (rhsSubId.endsWith('!')) {
    // The dimension ID at this position is "marked", indicating that the vector function
    // (e.g., `SUM`) should operate over the elements in this dimension.  Strip the "!"
    // to get the actual dimension ID, then get the associated array loop index variable.
    const rhsDimId = rhsSubId.replace('!', '')
    return optimalIndex(arrayIndexVars, rhsDimId)
  }

  if (isIndex(rhsSubId)) {
    // This is a specific subscript (i.e., an index); dereference the array using the index
    // number of the subscript
    return `${sub(rhsSubId).value}`
  }

  // At this point we know that it is a dimension ID.  Figure out which LHS subscript or
  // dimension is a match.  First see if there is an exact match.
  const lhsSubRefs = lhsVariable.parsedEqn.lhs.varDef.subscriptRefs
  const lhsSubIds = lhsSubRefs?.map(subRef => subRef.subId) || []
  const lhsDimIndex = lhsSubIds.findIndex(lhsSubId => lhsSubId === rhsSubId)
  if (lhsDimIndex >= 0) {
    // There is a match.  If the LHS variable is separated, use the separated subscript
    // ID at this position (i.e., the value from the `subscripts` array), otherwise we
    // use the dimension ID at this position.
    const lhsSubOrDimId = lhsVariable.subscripts[lhsDimIndex]
    if (isIndex(lhsSubOrDimId)) {
      // This is a specific subscript (i.e., an index); dereference the array using the index
      // number of the subscript
      return `${sub(lhsSubOrDimId).value}`
    } else {
      // This is a dimension; use the associated loop index variable
      return optimalIndex(loopIndexVars, lhsSubOrDimId)
    }
  }

  // There wasn't an exact match by dimension ID.  Find the position of the LHS dimension
  // that has a mapping to the RHS dimension.
  const mappedLhsDimIndex = lhsSubIds.findIndex(lhsSubId => hasMapping(rhsSubId, lhsSubId))
  if (mappedLhsDimIndex >= 0) {
    // There is a match.  If the LHS variable is separated, use the _mapped_ separated
    // subscript ID at this position (i.e., the value from the `subscripts` array),
    // otherwise we use the _mapped_ dimension ID at this position.
    const mappedLhsSubOrDimId = lhsVariable.subscripts[mappedLhsDimIndex]
    if (isIndex(mappedLhsSubOrDimId)) {
      // This is a specific subscript (i.e., an index); dereference the array using the index
      // number of the _mapped_ subscript
      const mappedLhsSubId = mappedLhsSubOrDimId
      const mappedLhsDimId = lhsSubIds[mappedLhsDimIndex]
      const lhsDim = sub(mappedLhsDimId)
      const rhsDim = sub(rhsSubId)
      const lhsSubIndex = lhsDim.value.indexOf(mappedLhsSubId)
      if (lhsSubIndex >= 0) {
        const mappedSubId = rhsDim.mappings[mappedLhsDimId][lhsSubIndex]
        return `${sub(mappedSubId).value}`
      } else {
        throw new Error(
          `Failed to find mapped LHS subscript ${mappedLhsSubId} for RHS dimension ${rhsSubId} in lhs=${lhsVariable.refId}`
        )
      }
    } else {
      // Determine the dimension mapping
      const mappedLhsDimId = lhsSubIds[mappedLhsDimIndex]
      const indexVarName = loopIndexVars.index(mappedLhsDimId)
      return `__map${rhsSubId}${mappedLhsDimId}[${indexVarName}]`
    }
  } else {
    throw new Error(`Failed to find LHS dimension for RHS dimension ${rhsSubId} in lhs=${lhsVariable.refId}`)
  }
}
