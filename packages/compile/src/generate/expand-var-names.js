import * as R from 'ramda'

import { cartesianProductOf, canonicalName } from '../_shared/helpers.js'
import { sub, isDimension } from '../_shared/subscript.js'

import Model from '../model/model.js'

/**
 * Return an array of names for all variable in the model, sorted alphabetically and expanded to
 * include the full set of subscripted variants for variables that include subscripts.
 *
 * @param canonical If true, convert names to canonical representation (variable identifiers), otherwise
 * return the original name of each variable as it appears in the model.
 * @returns {string[]} An array of variable names or identifiers.
 */
export function expandVarNames(canonical) {
  const sortedVars = R.sortBy(v => v.varName, Model.variables)
  return R.uniq(
    R.reduce(
      (a, v) => {
        if (v.varType !== 'lookup' && v.varType !== 'data' && v.includeInOutput) {
          if (canonical) {
            return R.concat(a, R.map(Model.cName, namesForVar(v)))
          } else {
            return R.concat(a, namesForVar(v))
          }
        } else {
          return a
        }
      },
      [],
      sortedVars
    )
  )
}

/**
 * Return an array of names for the given variable including all subscript variants.
 *
 * @param {*} v A `Variable` instance.
 * @returns {string[]} An array of expanded names for the given variable.
 */
function namesForVar(v) {
  if (v.parsedEqn === undefined) {
    // XXX: The special `Time` variable does not have a `parsedEqn`, so use the raw LHS
    return [v.modelLHS]
  }

  // Expand each variable to get the names of all subscripted variants
  const lhsVarDef = v.parsedEqn.lhs.varDef
  const lhsSubRefs = lhsVarDef.subscriptRefs
  if (lhsSubRefs?.length > 0) {
    // At each position, expand any dimensions or use a subscript (index) directly
    const subOrDimNames = lhsSubRefs.map(subRef => subRef.subName)
    return expandDims(lhsVarDef.varName, subOrDimNames)
  } else {
    // No subscripts, so include a single variable name
    return [lhsVarDef.varName]
  }
}

/**
 * Return an array of all expanded subscript combinations.
 *
 * @param {string} baseVarName The base name of the variable.
 * @param {string[]} subOrDimNames The array of subscript or dimension names.
 * @returns {string[]} An array of string representations of subscripted references,
 * e.g., `'x[A1,B1]' ,'x[A1,B2]', ...]`.
 */
function expandDims(baseVarName, subOrDimNames) {
  // Expand the dimension for each position
  const expanded = subOrDimNames.map(name => expandDim(name).flat(Infinity))

  // Expand these into the set of all combinations of subscripts for the variable
  const origCombos = cartesianProductOf(expanded)
  return origCombos.map(combo => {
    const subs = combo.join(',')
    return `${baseVarName}[${subs}]`
  })
}

/**
 * Return an array containing all subscript (index) names in the given dimension.  If
 * the given name is a subscript, it will return a single-element array with that
 * subscript name.
 *
 * @param {string} subOrDimName A subscript or dimension name.
 * @returns {string[]} A (possibly nested) array of subscript names.
 */
function expandDim(subOrDimName) {
  // Convert the name to an ID
  const subOrDimId = canonicalName(subOrDimName)

  if (isDimension(subOrDimId)) {
    // Get the object for the dimension
    const dimObj = sub(subOrDimId)

    // The dimension may contain a mix of individual subscripts (indices) and/or subdimensions,
    // so recursively expand them
    return dimObj.modelValue.map(expandDim)
  } else {
    // This is an individual subscript (index), so return it directly
    return [subOrDimName]
  }
}
