import { cartesianProductOf, canonicalName } from '../_shared/helpers.js'
import { isDimension, sub } from '../_shared/subscript.js'

/**
 * A single instance of a variable.
 * @typedef {Object} VarInstance
 * @property {string} varName The full name of the variable instance, e.g., "Variable Name[SubA, SubB]".
 * @property {number[]} [subIndices] The array of subscript indices; only defined if this variable
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
  const lhsSubIds = v.subscripts
  if (lhsSubIds === undefined || lhsSubIds.length === 0) {
    // No subscripts, so include a single variable name
    return [
      {
        varName: lhsVarDef.varName
      }
    ]
  }

  // At each position, expand any dimensions or use a subscript (index) directly
  const subOrDimNames = lhsSubIds.map(subOrDimId => {
    const subOrDimObj = sub(subOrDimId)
    if (subOrDimObj.modelName !== undefined) {
      return subOrDimObj.modelName
    } else {
      // XXX: Currently, the object returned by `sub` will not include the `modelName`
      // for subscripts (it's only defined for dimensions?), so if we don't have the
      // `modelName`, find it using the parent dimension object
      const dimObj = sub(subOrDimObj.family)
      if (dimObj !== undefined) {
        const subName = dimObj.modelValue[subOrDimObj.value]
        if (subName !== undefined) {
          return subName
        } else {
          throw new Error(`Failed to resolve name of subscript ${subOrDimId} for variable ${v.refId}`)
        }
      } else {
        throw new Error(
          `Failed to resolve dimension ${subOrDimObj.family} of subscript ${subOrDimId} for variable ${v.refId}`
        )
      }
    }
  })

  return expandDims(lhsVarDef.varName, subOrDimNames)
}

/**
 * Return an array of all expanded subscript combinations.
 *
 * @param {string} baseVarName The base name of the variable.
 * @param {string[]} subOrDimNames The array of subscript or dimension names.
 * @returns {VarInstance[]} An array of `VarInstance` objects with string representations of
 * subscripted references, e.g., `'x[A1,B1]', 'x[A1,B2]', ...`.
 */
function expandDims(baseVarName, subOrDimNames) {
  // Expand the dimension for each position
  const expanded = subOrDimNames.map(name => expandDim(name).flat(Infinity))

  // Expand these into the set of all combinations of subscripts for the variable
  const origCombos = cartesianProductOf(expanded)
  return origCombos.map(combo => {
    const subNames = combo.map(desc => desc.name).join(',')
    const subIndices = combo.map(desc => desc.index)
    return {
      varName: `${baseVarName}[${subNames}]`,
      subIndices
    }
  })
}

/**
 * Pairs a subscript name with its index.
 * @typedef {Object} SubDesc
 * @property {string} name The name of the subscript, e.g., "A1".
 * @property {number} index The subscript index relative to its parent dimension.
 */

/**
 * Return an array containing all subscript (index) names in the given dimension.  If
 * the given name is a subscript, it will return a single-element array with that
 * subscript name.
 *
 * @param {string} subOrDimName A subscript or dimension name.
 * @returns {SubDesc[]} A (possibly nested) array of `SubDesc` objects.
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
    // This is an individual subscript (index), so return its name and index value
    const subObj = sub(subOrDimId)
    return [
      {
        name: subOrDimName,
        index: subObj.value
      }
    ]
  }
}
