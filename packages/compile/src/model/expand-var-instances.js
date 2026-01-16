import { cartesianProductOf, canonicalName } from '../_shared/helpers.js'
import { isDimension, sub } from '../_shared/subscript.js'

/**
 * A single instance of a variable.
 * @typedef {Object} VarInstance
 * @property {string} varName The full name of the variable instance, e.g., "Variable Name[SubA, SubB]".
 * @property {number[]} [subscriptIndices] The array of subscript indices; only defined if this variable
 * has subscripts.
 */

/**
 * Return an array of names and subscript indices for the given variable, expanded to
 * include all subscript variants.
 *
 * @param {*} v A `Variable` object.
 * @returns {VarInstance[]} An array of `VarInstance` objects corresponding to the expanded variable.
 */
export function expandVar(v) {
  if (v.parsedEqn === undefined) {
    // XXX: The special `Time` variable does not have a `parsedEqn`, so use the raw LHS
    return [
      {
        varName: v.modelLHS
      }
    ]
  }

  // Expand each subscript position to get the names of all subscripted variants
  const lhsVarDef = v.parsedEqn.lhs.varDef
  const lhsSubOrDimIds = v.subscripts
  if (lhsSubOrDimIds === undefined || lhsSubOrDimIds.length === 0) {
    // No subscripts, so include a single variable name
    return [
      {
        varName: lhsVarDef.varName
      }
    ]
  }

  // At each position, expand any dimensions or use a subscript (index) directly
  return expandDims(lhsVarDef.varName, lhsSubOrDimIds)
}

/**
 * Return an array of all expanded subscript combinations.
 *
 * @param {string} baseVarName The base name of the variable.
 * @param {string[]} subOrDimIds The array of subscript or dimension IDs.
 * @returns {VarInstance[]} An array of `VarInstance` objects with string representations of
 * subscripted references, e.g., `'x[A1,B1]', 'x[A1,B2]', ...`.
 */
function expandDims(baseVarName, subOrDimIds) {
  // Expand the dimension for each position
  const expanded = subOrDimIds.map(id => expandSubSpecs(id).flat(Infinity))

  // Expand these into the set of all combinations of subscripts for the variable
  const origCombos = cartesianProductOf(expanded)
  return origCombos.map(combo => {
    const subNames = combo.map(spec => spec.name).join(',')
    const subIndices = combo.map(spec => spec.index)
    return {
      varName: `${baseVarName}[${subNames}]`,
      subscriptIndices: subIndices
    }
  })
}

/**
 * Pairs a subscript name with its index.
 * @typedef {Object} SubSpec
 * @property {string} name The name of the subscript, e.g., "A1".
 * @property {number} index The subscript index relative to its parent dimension.
 */

/**
 * Return an array containing all subscript specs in the given dimension.  If
 * the given ID is a subscript, it will return a single-element array with that
 * subscript name and index.
 *
 * @param {string} subOrDimId A subscript or dimension ID (e.g., '_a1', '_dima').
 * @returns {SubSpec[]} A (possibly nested) array of `SubSpec` objects.
 */
function expandSubSpecs(subOrDimId) {
  if (isDimension(subOrDimId)) {
    // Get the object for the dimension
    const dimObj = sub(subOrDimId)

    // The dimension may contain a mix of individual subscripts (indices) and/or subdimensions,
    // so recursively expand them
    return dimObj.value.map(expandSubSpecs)
  } else {
    // This is an individual subscript (index), so return its name and index value
    // XXX: Currently, the object returned by `sub` will not include the `modelName`
    // for subscripts (it's only defined for dimensions?), so if we don't have the
    // `modelName`, find it using the parent dimension object.  This could be avoided
    // if subscript objects maintained their original model name.
    const subObj = sub(subOrDimId)
    const dimSubNames = expandSubNamesForDim(subObj.family).flat(Infinity)
    const subName = dimSubNames[subObj.value]
    if (subName === undefined) {
      throw new Error(`Failed to resolve name of subscript ${subOrDimId} in dimension ${subObj.family}`)
    }
    return [
      {
        name: subName,
        index: subObj.value
      }
    ]
  }
}

/**
 * Return an array containing all subscript (index) names in the given dimension,
 * expanding subdimensions as needed.  If the given ID is a subscript, it will return
 * single-element array with that subscript name.
 *
 * @param {string} dimId A dimension ID (e.g., '_dima').
 * @returns {string[]} A (possibly nested) array of subscript names (e.g., 'A1').
 */
function expandSubNamesForDim(dimId) {
  if (!isDimension(dimId)) {
    throw new Error('expandSubNames should only be called with a dimension ID')
  }

  // Get the object for the dimension
  const dimObj = sub(dimId)

  // The dimension may contain a mix of individual subscripts (indices) and/or
  // subdimensions, so recursively expand them
  return dimObj.modelValue.map(subOrDimName => {
    const subOrDimId = canonicalName(subOrDimName)
    if (isDimension(subOrDimId)) {
      return expandSubNamesForDim(subOrDimId)
    } else {
      return [subOrDimName]
    }
  })
}
