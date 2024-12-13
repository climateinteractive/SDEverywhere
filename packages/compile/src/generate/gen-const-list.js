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
  // In the "read variables" phase, const lists are expanded into separated variable
  // definitions, so `variable` here will have `subscripts` that represent specific
  // subscript indices that are ordered according to the dimension positions from the
  // variable definition.
  //
  // In the following example, we have a 2D variable whose original dimensions are:
  //   DimA: A1, A2 ~~|
  //   DimB: B1, B2, B3 ~~|
  //   x[DimB, DimA] = 1, 2; 3, 4; 5, 6; ~~|
  //
  // The variable `x` will have been separated into:
  //   x[B1,A1]
  //   x[B1,A2]
  //   x[B2,A1]
  //   ...
  //
  // Each one will refer to a single element from the original const list.  To determine
  // which element in the const list goes with which variable instance, we build an array
  // of all subscript combinations and then find the index of the one that matches the
  // combination used for the separated variable instance.
  const lhsSubRefs = variable.parsedEqn.lhs.varDef.subscriptRefs
  const lhsSubIds = lhsSubRefs.map(subRef => subRef.subId)
  const subIdArrays = lhsSubIds.map(subOrDimId => {
    if (isDimension(subOrDimId)) {
      // Use the full array of subscripts (indexes) for the dimension at this position
      return sub(subOrDimId).value
    } else {
      // This is a single subscript (index), so use an array with a single element
      return [subOrDimId]
    }
  })

  // Continuing with the above example, at this point we will have a 2D array:
  //   [
  //     [_b1,_b2,_b3],
  //     [_a1,_a2]
  //   ]
  // We expand these into the set of all combinations of subscripts in the original
  // order of the dimensions from the equation LHS.
  const origCombos = cartesianProductOf(subIdArrays)

  // Convert to strings to make matching easier.  Now we have the combinations in
  // original order.
  //   [_b1,_a1]
  //   [_b1,_a2]
  //   [_b2,_a1]
  //   ...
  const comboStrings = origCombos.map(combo => combo.map(subId => `[${subId}]`).join(''))

  // Convert `variable.subscripts` into the same format so that we can do an array lookup,
  // for example if this separated variable instance is x[_b1,_a2], this will be:
  //   [_b1,_a2]
  const lhsComboString = variable.subscripts.map(subId => `[${subId}]`).join('')

  // Find the index of the combination that matches `variable.subscripts`
  const constIndex = comboStrings.indexOf(lhsComboString)
  if (constIndex < 0) {
    throw new Error(`Failed to determine index of const list element for ${variable.refId}`)
  }

  // Determine the LHS and RHS of the const assignment
  const lhsVarId = variable.varName
  const lhsIndicesString = variable.subscripts.map(subId => `[${sub(subId).value}]`).join('')
  const lhsRef = `${lhsVarId}${lhsIndicesString}`
  const rhsConstValue = cdbl(parsedEqn.rhs.constants[constIndex].value)
  return `  ${lhsRef} = ${rhsConstValue};`
}
