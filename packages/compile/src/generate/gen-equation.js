import {
  dimensionNames,
  isDimension,
  isIndex,
  isTrivialDimension,
  normalizeSubscripts,
  sub
} from '../_shared/subscript.js'
import { generateConstListElement } from './gen-const-list.js'

import { generateDirectConstInit } from './gen-direct-const.js'
import { generateDirectDataInit } from './gen-direct-data.js'
import { generateExpr } from './gen-expr.js'
import { generateExternalDataInit } from './gen-external-data.js'
import { generateLookup } from './gen-lookup.js'

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
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateEquation(variable, mode, extData, directData, modelDir) {
  // Maps of LHS subscript families to loop index vars for lookup on the RHS
  const loopIndexVars = new LoopIndexVars(['i', 'j', 'k', 'l', 'm'])
  const arrayIndexVars = new LoopIndexVars(['u', 'v', 'w', 's', 't', 'f', 'g', 'h', 'o', 'p', 'q', 'r'])

  // Generate the LHS variable reference code
  const parsedEqn = variable.parsedEqn
  const cLhs = cLhsForEqn(parsedEqn, loopIndexVars)

  // Apply special handling for const lists
  if (parsedEqn.rhs.kind === 'const-list') {
    if (mode !== 'init-constants') {
      throw new Error(`Invalid code gen mode '${mode}' for const list variable ${variable.modelLHS}`)
    }
    return generateConstListElement(variable, parsedEqn)
  }

  // Apply special handling for data variables
  if (variable.isData()) {
    // If the data var was converted from a const, it will have lookup points.
    // Otherwise, read a data file to get lookup data.
    if (mode !== 'decl' && mode !== 'init-lookups') {
      throw new Error(`Invalid code gen mode '${mode}' for data variable ${variable.modelLHS}`)
    }
    if (variable.points.length === 0) {
      if (variable.directDataArgs) {
        return generateDirectDataInit(variable, mode, directData, modelDir, cLhs)
      } else {
        return generateExternalDataInit(variable, mode, extData, cLhs)
      }
    } else if (mode === 'decl') {
      return []
    }
  }

  // Apply special handling for lookups
  if (variable.isLookup()) {
    if (mode !== 'decl' && mode !== 'init-lookups') {
      throw new Error(`Invalid code gen mode '${mode}' for lookup ${variable.modelLHS}`)
    }
    return generateLookup(variable, mode, cLhs, loopIndexVars)
  }

  // TODO: include `// [model equation]`
  const comments = ['  // TODO']

  // Emit direct constants individually without separating them first
  if (variable.directConstArgs) {
    const initCode = generateDirectConstInit(variable, modelDir)
    return [...comments, ...initCode]
  }

  // Get the dimension IDs for the LHS variable
  const dimIds = dimensionNames(variable.subscripts)

  // Turn each dimension ID into a loop with a loop index variable.
  // If the variable has no subscripts, nothing will be emitted here.
  const openLoops = []
  const closeLoops = []
  for (const dimId of dimIds) {
    const indexName = loopIndexVars.index(dimId)
    const dimLength = sub(dimId).size
    openLoops.push(`  for (size_t ${indexName} = 0; ${indexName} < ${dimLength}; ${indexName}++) {`)
    closeLoops.push('  }')
  }

  // TODO: Keep track of marked dimensions
  const markedDimIds = []

  // TODO: temporary variables
  const tmpVars = []

  // Generate code for an equation with an expression on the RHS
  const genExprCtx = {
    variable,
    mode,
    cLhs,
    cVarRef: varRef => cVarRef(variable, varRef, markedDimIds, loopIndexVars, arrayIndexVars)
  }
  const cRhs = generateExpr(parsedEqn.rhs.expr, genExprCtx)
  const formula = `  ${cLhs} = ${cRhs};`

  // Combine all lines of comments and code into a single array
  return [...comments, ...openLoops, ...tmpVars, formula, ...closeLoops]
}

/**
 * Return the C code for the LHS (i.e., the subscripted variable reference) of the given equation.
 *
 * @param {*} parsedEqn The parsed equation.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string} The C variable reference.
 */
function cLhsForEqn(parsedEqn, loopIndexVars) {
  const lhsVarRef = parsedEqn.lhs.varRef
  const lhsSubRefs = lhsVarRef.subscriptRefs || []
  const cSubParts = lhsSubRefs.map(subRef => {
    const subId = subRef.subId
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
  return `${lhsVarRef.varId}${cSubParts.join('')}`
}

/**
 * Return the C code for a RHS (possibly subscripted) variable reference.
 *
 * @param {*} lhsVariable The LHS `Variable` instance.
 * @param {*} rhsVarRef The `VariableRef` used in a RHS expression.
 * @param {string[]} markedDimIds The array of dimension IDs that are marked for use
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

  // Normalize the RHS subscripts
  let rhsSubIds
  try {
    rhsSubIds = normalizeSubscripts(rhsVarRef.subscriptRefs.map(subRef => subRef.subId))
  } catch (e) {
    throw new Error(`normalizeSubscripts failed in rhsVarRef: refId=${lhsVariable.refId} error=${e}`)
  }

  // Determine the subscript code (array lookup) for each dimension.  For example, if
  // the RHS variable reference in the model looks like `x[DimA]`, this will convert the
  // `[DimA]` part to `[_dima[i]]` (or simply `[i]` if it is a "trivial" dimension).
  const cSubParts = rhsSubIds.map(rhsSubId => {
    if (isIndex(rhsSubId)) {
      // This is a specific subscript (i.e., an index); dereference the array using the index
      // number of the subscript
      return `[${sub(rhsSubId).value}]`
    }

    // Otherwise, this is a dimension. Get the corresponding loop index variable used
    // in the "for" loop.
    let indexName
    if (markedDimIds.includes(rhsSubId)) {
      // This is a marked dimension as used in an array function (e.g., `SUM`), so use
      // the name of the array loop index variable
      indexName = arrayIndexVars.index(rhsSubId)
    } else {
      // TODO: Implement!
      // // Use the single index name for a separated variable if it exists.
      // let separatedIndexName = separatedVariableIndex(rhsSub, this.var, subscripts)
      // if (separatedIndexName) {
      //   return `[${sub(separatedIndexName).value}]`
      // }

      // See if we need to apply a mapping because the RHS dim is not found on the LHS
      const found = lhsVariable.subscripts.findIndex(lhsSubId => sub(lhsSubId).family === sub(rhsSubId).family)
      if (found < 0) {
        // TODO: Implement!
        // // Find the mapping from the RHS subscript to a LHS subscript
        // for (let lhsSub of this.var.subscripts) {
        //   if (hasMapping(rhsSub, lhsSub)) {
        //     // console.error(`${this.var.refId} hasMapping ${rhsSub} → ${lhsSub}`);
        //     i = this.loopIndexVars.index(lhsSub)
        //     return `[__map${rhsSub}${lhsSub}[${i}]]`
        //   }
        // }
      }

      // There is no mapping, so use the loop index for this dim family on the LHS
      indexName = loopIndexVars.index(rhsSubId)
    }

    // Dereference the array using the corresponding loop index variable
    if (isTrivialDimension(rhsSubId)) {
      // When the dimension is trivial, we can emit e.g. `[i]` instead of `[_dim[i]]`
      return `[${indexName}]`
    } else {
      return `[${rhsSubId}[${indexName}]]`
    }
  })

  return `${rhsVarRef.varId}${cSubParts.join('')}`
}
