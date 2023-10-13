import * as R from 'ramda'

import { cdbl, listConcat } from '../_shared/helpers.js'
import { isDimension, isTrivialDimension, sub } from '../_shared/subscript.js'

/**
 * Generate code for a variable that uses `GET DIRECT DATA` to source data from an external file
 * (in CSV or Excel format).
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {string} varLhs The C code for the LHS variable reference.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string[]} A array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateLookup(variable, mode, varLhs, loopIndexVars) {
  // Construct the name of the data array, which is based on the associated lookup var name,
  // with any subscripts tacked on the end.
  const dataName = variable.varName + '_data_' + generateLookupDataName(variable.subscripts, loopIndexVars)
  if (mode === 'decl') {
    // In decl mode, declare a static data array that will be used to create the associated `Lookup`
    // at init time. Using static arrays is better for code size, helps us avoid creating a copy of
    // the data in memory, and seems to perform much better when compiled to wasm when compared to the
    // previous approach that used varargs + copying, especially on constrained (e.g. iOS) devices.
    let data = R.reduce((a, p) => listConcat(a, `${cdbl(p[0])}, ${cdbl(p[1])}`, true), '', variable.points)
    return [`double ${dataName}[${variable.points.length * 2}] = { ${data} };`]
  } else if (mode === 'init-lookups') {
    // In init mode, create the `Lookup`, passing in a pointer to the static data array declared earlier.
    // TODO: Make use of the lookup range
    if (variable.points.length < 1) {
      throw new Error(`ERROR: lookup size = ${variable.points.length} in ${varLhs}`)
    }
    return [`  ${varLhs} = __new_lookup(${variable.points.length}, /*copy=*/false, ${dataName});`]
  } else {
    return []
  }
}

/**
 * Return a C name for the static data array associated with a lookup variable.
 *
 * @param {string[]} subIds The array of subscript IDs.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string} The C array name.
 */
function generateLookupDataName(subIds, loopIndexVars) {
  return R.map(subId => {
    if (isDimension(subId)) {
      let i = loopIndexVars.index(subId)
      if (isTrivialDimension(subId)) {
        // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
        return `_${i}_`
      } else {
        return `_${subId}_${i}_`
      }
    } else {
      return `_${sub(subId).value}_`
    }
  }, subIds).join('')
}
