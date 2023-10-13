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
 * @return {string[]} A array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateEquation(variable, mode, extData, directData, modelDir) {
  // Maps of LHS subscript families to loop index vars for lookup on the RHS
  const loopIndexVars = new LoopIndexVars(['i', 'j', 'k', 'l', 'm'])
  // const arrayIndexVars = new LoopIndexVars(['u', 'v', 'w', 's', 't', 'f', 'g', 'h', 'o', 'p', 'q', 'r'])

  // Generate the LHS variable reference code
  const parsedEqn = variable.parsedEqn
  const lhs = lhsForEqn(parsedEqn)

  // Apply special handling for data variables
  if (variable.isData()) {
    // If the data var was converted from a const, it will have lookup points.
    // Otherwise, read a data file to get lookup data.
    if (mode !== 'decl' && mode !== 'init-lookups') {
      throw new Error(`Invalid code gen mode '${mode}' for data variable ${variable.modelLHS}`)
    }
    if (variable.points.length === 0) {
      if (variable.directDataArgs) {
        return generateDirectDataInit(variable, mode, directData, modelDir, lhs)
      } else {
        return generateExternalDataInit(variable, mode, extData, lhs)
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
    return generateLookup(variable, mode, lhs, loopIndexVars)
  }

  // TODO: include `// [model equation]`
  const comments = ['  // TODO']

  // Emit direct constants individually without separating them first
  if (variable.directConstArgs) {
    const initCode = generateDirectConstInit(variable, modelDir)
    return [...comments, ...initCode]
  }

  // TODO: dimension names
  // TODO: open subscript loop code
  const openLoops = []
  // TODO: temporary variables
  const tmpVars = []

  // Generate code for an equation with an expression on the RHS
  const rhs = generateExpr(parsedEqn.rhs.expr, { variable, mode, varLhs: lhs })
  const formula = `  ${lhs} = ${rhs};`

  // TODO: close subscript loop code
  const closeLoops = []

  // Combine all lines of comments and code into a single array
  return [...comments, ...openLoops, ...tmpVars, formula, ...closeLoops]
}

/**
 * Generate the LHS code (i.e., the subscripted variable reference) for the given equation.
 *
 * TODO: Types
 *
 * @param {*} parsedEqn
 * @return {string} The LHS variable reference.
 */
function lhsForEqn(parsedEqn) {
  // TODO: Include subscripts
  return parsedEqn.lhs.varRef.varId
}
