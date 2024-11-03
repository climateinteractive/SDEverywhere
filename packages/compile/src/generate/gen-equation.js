import {
  dimensionNames,
  hasMapping,
  isDimension,
  isIndex,
  isTrivialDimension,
  separatedVariableIndex,
  sub
} from '../_shared/subscript.js'
import { generateConstListElement } from './gen-const-list.js'

import { generateDirectConstInit } from './gen-direct-const.js'
import { generateExpr } from './gen-expr.js'
import { generateLookupsFromDirectData } from './gen-lookup-from-direct.js'
import { generateLookupsFromExternalData } from './gen-lookup-from-external.js'
import { generateLookupFromPoints } from './gen-lookup-from-points.js'

import LoopIndexVars from './loop-index-vars.js'

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
  const loopIndexVars = new LoopIndexVars(['i', 'j', 'k', 'l', 'm'])
  const arrayIndexVars = new LoopIndexVars(['u', 'v', 'w', 's', 't', 'f', 'g', 'h', 'o', 'p', 'q', 'r'])

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

  // Get the dimension IDs for the LHS variable
  const dimIds = dimensionNames(variable.subscripts)

  // Turn each dimension ID into a loop with a loop index variable.
  // If the variable has no subscripts, nothing will be emitted here.
  const indexDecl = outFormat === 'js' ? 'let' : 'size_t'
  const openLoops = []
  const closeLoops = []
  for (const dimId of dimIds) {
    const indexName = loopIndexVars.index(dimId)
    const dimLength = sub(dimId).size
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

  // Keep track of marked dimensions
  const markedDimIds = new Set()

  // Generate code for an equation with an expression on the RHS
  const genExprCtx = {
    variable,
    mode,
    outFormat,
    cLhs,
    loopIndexVars,
    arrayIndexVars,
    resetMarkedDims: () => markedDimIds.clear(),
    addMarkedDim: dimId => markedDimIds.add(dimId),
    emitPreInnerLoop: s => preInnerLoopLines.push(s),
    emitPreFormula: s => preFormulaLines.push(s),
    emitPostFormula: s => postFormulaLines.push(s),
    cVarRef: varRef => cVarRef(variable, varRef, markedDimIds, loopIndexVars, arrayIndexVars),
    cVarRefWithLhsSubscripts: baseVarId => cVarRefWithLhsSubscripts(variable, baseVarId, loopIndexVars),
    cVarIndex: subOrDimId => cVarIndex(variable, [subOrDimId], subOrDimId, markedDimIds, loopIndexVars, arrayIndexVars)
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
        return `[${subId}][${i}]`
      }
    } else {
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
 * @param {Set<string>} markedDimIds The set of dimension IDs that are marked for use
 * in an array function, for example `SUM(x[DimA!])`.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions
 * (that use marked dimensions).
 * @returns {string} The C variable reference.
 */
function cVarRef(lhsVariable, rhsVarRef, markedDimIds, loopIndexVars, arrayIndexVars) {
  if (rhsVarRef.subscriptRefs === undefined) {
    // No subscripts, so return the base variable ID
    return rhsVarRef.varId
  }

  // Get the RHS subscripts
  // XXX: For now, strip the mark here (need to revisit this)
  const rhsSubIds = rhsVarRef.subscriptRefs.map(subRef => subRef.subId.replace('!', ''))

  // Determine the subscript code (array lookup) for each dimension.  For example, if
  // the RHS variable reference in the model looks like `x[DimA]`, this will convert the
  // `[DimA]` part to `[_dima[i]]` (or simply `[i]` if it is a "trivial" dimension).
  const cSubParts = rhsSubIds.map(rhsSubId => {
    return cVarIndex(lhsVariable, rhsSubIds, rhsSubId, markedDimIds, loopIndexVars, arrayIndexVars)
  })

  return `${rhsVarRef.varId}${cSubParts.map(part => `[${part}]`).join('')}`
}

/**
 * Return the C code for indexing into a subscripted variable.
 *
 * @param {*} lhsVariable The LHS `Variable` instance.
 * @param {string[]} rhsSubIds The set of all subscript or dimension IDs used on the RHS.
 * @param {string} rhsSubId The specific subscript or dimension ID being evaluated.
 * @param {Set<string>} markedDimIds The set of dimension IDs that are marked for use
 * in an array function, for example `SUM(x[DimA!])`.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions
 * (that use marked dimensions).
 * @returns {string} The C variable reference.
 */
function cVarIndex(lhsVariable, rhsSubIds, rhsSubId, markedDimIds, loopIndexVars, arrayIndexVars) {
  if (isIndex(rhsSubId)) {
    // This is a specific subscript (i.e., an index); dereference the array using the index
    // number of the subscript
    return `${sub(rhsSubId).value}`
  }

  // Otherwise, this is a dimension. Get the corresponding loop index variable used
  // in the "for" loop.
  let indexName
  if (markedDimIds.has(rhsSubId)) {
    // This is a marked dimension as used in an array function (e.g., `SUM`), so use
    // the name of the array loop index variable
    indexName = arrayIndexVars.index(rhsSubId)
  } else {
    // Use the single index name for a separated variable if it exists
    const separatedIndexName = separatedVariableIndex(rhsSubId, lhsVariable, rhsSubIds)
    if (separatedIndexName) {
      return `${sub(separatedIndexName).value}`
    }

    // See if we need to apply a mapping because the RHS dim is not found on the LHS
    const found = lhsVariable.subscripts.findIndex(lhsSubId => sub(lhsSubId).family === sub(rhsSubId).family)
    if (found < 0) {
      // Find the mapping from the RHS subscript to a LHS subscript
      for (const lhsSubId of lhsVariable.subscripts) {
        if (hasMapping(rhsSubId, lhsSubId)) {
          indexName = loopIndexVars.index(lhsSubId)
          return `__map${rhsSubId}${lhsSubId}[${indexName}]`
        }
      }
    }

    // There is no mapping, so use the loop index for this dim family on the LHS
    indexName = loopIndexVars.index(rhsSubId)
  }

  // Dereference the array using the corresponding loop index variable
  if (isTrivialDimension(rhsSubId)) {
    // When the dimension is trivial, we can emit e.g. `[i]` instead of `[_dim[i]]`
    return `${indexName}`
  } else {
    return `${rhsSubId}[${indexName}]`
  }
}
