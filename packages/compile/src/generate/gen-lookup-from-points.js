import * as R from 'ramda'

import { cdbl, listConcat } from '../_shared/helpers.js'
import { isDimension, isTrivialDimension, sub } from '../_shared/subscript.js'

/**
 * Generate code for a data or lookup variable that contains an explicit set of points.
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {boolean} copy If false, a static data array will be used (good for larger data sets).
 * If true, the data will inlined and copied when initializing the lookup (good for smaller data sets).
 * @param {string} varLhs The C code for the LHS variable reference.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateLookupFromPoints(variable, mode, copy, varLhs, loopIndexVars) {
  if (variable.points.length === 0) {
    throw new Error(`Empty lookup data array for ${variable.modelLHS}`)
  }

  if (copy) {
    // Inline the data points and copy them when initializing the lookup
    if (mode === 'decl') {
      // Nothing to emit in decl mode
      return []
    } else if (mode === 'init-lookups') {
      // In init mode, generate a new lookup using the data points from the variable
      let lookupData = R.reduce((a, p) => listConcat(a, `${cdbl(p[0])}, ${cdbl(p[1])}`, true), '', variable.points)
      return [`  ${varLhs} = __new_lookup(${variable.points.length}, /*copy=*/true, (double[]){ ${lookupData} });`]
    }
  } else {
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
      return [`  ${varLhs} = __new_lookup(${variable.points.length}, /*copy=*/false, ${dataName});`]
    }
  }

  throw new Error(`Invalid code gen mode '${mode}' for lookup ${variable.modelLHS}`)
}

/**
 * Return a C name for the static data array associated with a lookup variable.
 *
 * @param {string[]} subIds The array of subscript IDs.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @return {string} The C array name.
 */
function generateLookupDataName(subIds, loopIndexVars) {
  return subIds
    .map(subId => {
      if (isDimension(subId)) {
        const i = loopIndexVars.index(subId)
        if (isTrivialDimension(subId)) {
          // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
          return `_${i}_`
        } else {
          return `_${subId}_${i}_`
        }
      } else {
        return `_${sub(subId).value}_`
      }
    })
    .join('')
}
