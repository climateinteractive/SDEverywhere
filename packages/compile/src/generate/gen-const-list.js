import { cartesianProductOf, cdbl } from '../_shared/helpers.js'
import { isDimension, sub } from '../_shared/subscript.js'

/**
 * Generate code for a single element in a const list definition.
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {*} parsedEqn The parsed equation.
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateConstListElement(variable, parsedEqn) {
  // All const lists with > 1 value are separated on dimensions in the LHS.
  // The LHS of a separated variable here will contain only index subscripts in normal order.
  const lhsVarId = variable.varName
  const lhsSubIds = variable.subscripts.map(subId => `[${subId}]`).join('')
  const lhsSubIndexes = variable.subscripts.map(subId => `[${sub(subId).value}]`).join('')
  const lhsRef = `${lhsVarId}${lhsSubIndexes}`

  // Build a list of all combinations of subscripts for the variable
  // TODO: This won't work if number of subscripts doesn't match number of separationDims
  const subIds = variable.separationDims.map(s => (isDimension(s) ? sub(s).value : [s]))

  // Convert to strings to make matching easier
  const allCombos = cartesianProductOf(subIds).map(combo => combo.map(subId => `[${subId}]`).join(''))

  // Find the index of the combination that matches the variable's subscripts
  const constIndex = allCombos.indexOf(lhsSubIds)
  if (constIndex < 0) {
    throw new Error(`Failed to determine index of const list element for ${variable.refId}`)
  }

  const constValue = cdbl(parsedEqn.rhs.constants[constIndex].value)
  return [`${lhsRef} = ${constValue};`]
}
