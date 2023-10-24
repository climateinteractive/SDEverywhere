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

  // Build a list of all combinations of subscripts for the variable.  For example, suppose
  // we have:
  //   x[A1,DimB] = 1,2 ~~|
  // The variable will have been separated into:
  //   x[A1,B1]
  //   x[A1,B2]
  // Each one will refer to the original const list.  To determine which element in the
  // const list goes with which variable instance, we build an array of all subscript
  // combinations and then find the index of the one that matches the combination used
  // for the separated variable instance.
  const subIdArrays = parsedEqn.lhs.varRef.subscriptRefs.map(subRef => {
    const subOrDimId = subRef.subId
    if (isDimension(subOrDimId)) {
      // Use the full array of subscripts (indexes) for the dimension at this position
      return sub(subOrDimId).value
    } else {
      // This is a single subscript (index), so use an array with a single element
      return [subOrDimId]
    }
  })

  // Convert to strings to make matching easier
  const allCombos = cartesianProductOf(subIdArrays).map(combo => combo.map(subId => `[${subId}]`).join(''))

  // Find the index of the combination that matches the variable's subscripts
  const constIndex = allCombos.indexOf(lhsSubIds)
  if (constIndex < 0) {
    throw new Error(`Failed to determine index of const list element for ${variable.refId}`)
  }

  const constValue = cdbl(parsedEqn.rhs.constants[constIndex].value)
  return [`${lhsRef} = ${constValue};`]
}
