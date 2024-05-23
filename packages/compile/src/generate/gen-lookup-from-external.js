import * as R from 'ramda'

import { cartesianProductOf, permutationsOf } from '../_shared/helpers.js'
import { isDimension, sub } from '../_shared/subscript.js'
import { pointsString } from './gen-lookup-from-points.js'

/**
 * Generate code for a data variable whose data is sourced from an external file (in DAT format).
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {Map<string, any>} extData The map of datasets from external `.dat` files.
 * @param {string} varLhs The C/JS code for the LHS variable reference.
 * @param {'c' | 'js'} outFormat The output format.
 * @return {string[]} An array of strings containing the generated C/JS code for the variable,
 * one string per line of code.
 */
export function generateLookupsFromExternalData(variable, mode, extData, varLhs, outFormat) {
  if (mode !== 'decl' && mode !== 'init-lookups') {
    throw new Error(`Invalid code gen mode '${mode}' for data variable ${variable.modelLHS}`)
  }

  // If there is external data for this variable, copy it from an external file to a lookup.
  // Just like in `generateLookupFromPoints`, we declare static arrays to hold the data points in
  // the first pass ("decl" mode), then initialize each `Lookup` using that data in the second pass
  // ("init" mode).
  const newLookup = (name, lhs, data, subscriptIndexes) => {
    if (!data) {
      throw new Error(`Data for ${name} not found in external data sources`)
    }

    if (data.size === 0) {
      throw new Error(`Empty lookup data array for ${lhs}`)
    }

    const dataName = variable.varName + '_data_' + R.map(i => `_${i}_`, subscriptIndexes).join('')
    if (mode === 'decl') {
      // In decl mode, declare a static data array that will be used to create the associated `Lookup`
      // at init time
      const points = pointsString(Array.from(data.entries()))
      switch (outFormat) {
        case 'c':
          return `double ${dataName}[${data.size * 2}] = { ${points} };`
        case 'js':
          return `const ${dataName} = [${points}];`
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
    } else if (mode === 'init-lookups') {
      // In init mode, create the `Lookup`, passing in a pointer to the static data array declared in decl mode.
      switch (outFormat) {
        case 'c':
          return `  ${lhs} = __new_lookup(${data.size}, /*copy=*/false, ${dataName});`
        case 'js':
          return `  ${lhs} = fns.createLookup(${data.size}, ${dataName});`
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
    } else {
      return []
    }
  }

  // There are three common cases that we handle:
  //  - variable has no subscripts (C variable _thing = _thing from dat file)
  //  - variable has subscript(s) (C variable with index _thing[0] = _thing[_subscript] from dat file)
  //  - variable has dimension(s) (C variable in for loop, _thing[i] = _thing[_subscript_i] from dat file)

  if (!variable.subscripts || variable.subscripts.length === 0) {
    // No subscripts
    const data = extData.get(variable.varName)
    return [newLookup(variable.varName, varLhs, data, [])]
  }

  if (variable.subscripts.length === 1 && !isDimension(variable.subscripts[0])) {
    // There is exactly one subscript
    const subscript = variable.subscripts[0]
    const nameInDat = `${variable.varName}[${subscript}]`
    const data = extData.get(nameInDat)
    const subIndex = sub(subscript).value
    return [newLookup(nameInDat, varLhs, data, [subIndex])]
  }

  if (!R.all(s => isDimension(s), variable.subscripts)) {
    // We don't yet handle the case where there are more than one subscript or a mix of
    // subscripts and dimensions
    // TODO: Remove this restriction
    throw new Error(`Data variable ${variable.varName} has >= 2 subscripts; not yet handled`)
  }

  // At this point, we know that we have one or more dimensions; compute all combinations
  // of the dimensions that we will iterate over
  const lines = []
  const allDims = R.map(s => sub(s).value, variable.subscripts)
  const dimTuples = cartesianProductOf(allDims)
  for (const dims of dimTuples) {
    // Note: It appears that the dat file can have the subscripts in a different order
    // than what SDE uses when declaring the C array.  If we don't find data for one
    // order, we try the other possible permutations.
    const dimNamePermutations = permutationsOf(dims)
    let nameInDat, data
    for (const dimNames of dimNamePermutations) {
      nameInDat = `${variable.varName}[${dimNames.join(',')}]`
      data = extData.get(nameInDat)
      if (data) {
        break
      }
    }
    if (!data) {
      // We currently treat this as a warning, not an error, since there can sometimes be
      // datasets that are a sparse matrix, i.e., data is not defined for certain dimensions.
      // For these cases, the lookup will not be initialized (the Lookup pointer will remain
      // NULL, and any calls to `LOOKUP` will return `:NA:`.
      if (mode === 'decl') {
        console.error(`WARNING: Data for ${nameInDat} not found in external data sources`)
      }
      continue
    }

    const subscriptIndexes = R.map(dim => sub(dim).value, dims)
    const varSubscripts = R.map(index => `[${index}]`, subscriptIndexes).join('')
    const lhs = `${variable.varName}${varSubscripts}`
    const lookup = newLookup(nameInDat, lhs, data, subscriptIndexes)
    if (lookup) {
      lines.push(lookup)
    }
  }

  return lines
}
