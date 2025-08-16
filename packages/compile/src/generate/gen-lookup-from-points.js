import { cdbl } from '../_shared/helpers.js'
import { isDimension, isTrivialDimension, sub } from '../_shared/subscript.js'

/**
 * Generate code for a data or lookup variable that contains an explicit set of points.
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {boolean} copy If false, a static data array will be used (good for larger data sets).
 * If true, the data will inlined and copied when initializing the lookup (good for smaller data sets).
 * @param {string} varLhs The C/JS code for the LHS variable reference.
 * @param {LoopIndexVars} loopIndexVars The loop index state.
 * @param {'c' | 'js'} outFormat The output format.
 * @return {string[]} An array of strings containing the generated C/JS code for the variable,
 * one string per line of code.
 */
export function generateLookupFromPoints(variable, mode, copy, varLhs, loopIndexVars, outFormat) {
  if (variable.points.length === 0) {
    // In the case where the lookup data array is empty (typically this only occurs in the
    // case of game inputs), generate a new empty lookup
    if (mode === 'decl') {
      // Nothing to emit in decl mode
      return []
    } else if (mode === 'init-lookups') {
      // In init mode, generate a new empty lookup
      switch (outFormat) {
        case 'c':
          return [`  ${varLhs} = __new_lookup(0, /*copy=*/false, NULL);`]
        case 'js':
          return [`  ${varLhs} = fns.createLookup(0, undefined);`]
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
    }
  } else if (copy) {
    // Inline the data points and copy them when initializing the lookup
    if (mode === 'decl') {
      // Nothing to emit in decl mode
      return []
    } else if (mode === 'init-lookups') {
      // In init mode, generate a new lookup using the data points from the variable
      const points = pointsString(variable.points)
      switch (outFormat) {
        case 'c':
          return [`  ${varLhs} = __new_lookup(${variable.points.length}, /*copy=*/true, (double[]){ ${points} });`]
        case 'js':
          return [`  ${varLhs} = fns.createLookup(${variable.points.length}, [${points}]);`]
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
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
      const points = pointsString(variable.points)
      switch (outFormat) {
        case 'c':
          return [`double ${dataName}[${variable.points.length * 2}] = { ${points} };`]
        case 'js':
          return [`const ${dataName} = [${points}];`]
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
    } else if (mode === 'init-lookups') {
      // In init mode, create the `Lookup`, passing in a pointer to the static data array declared earlier.
      // TODO: Make use of the lookup range
      switch (outFormat) {
        case 'c':
          return [`  ${varLhs} = __new_lookup(${variable.points.length}, /*copy=*/false, ${dataName});`]
        case 'js':
          return [`  ${varLhs} = fns.createLookup(${variable.points.length}, ${dataName});`]
        default:
          throw new Error(`Unhandled output format '${outFormat}'`)
      }
    }
  }

  throw new Error(`Invalid code gen mode '${mode}' for lookup ${variable.modelLHS}`)
}

/**
 * Return a string containing a comma separated list of [x,y] pairs from the given array of points.
 *
 * @param {number[][]} points The array of [x,y] tuples.
 * @return {string} The string containing the comma separated point values.
 */
export function pointsString(points) {
  return points.map(p => `${cdbl(p[0])}, ${cdbl(p[1])}`).join(', ')
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
