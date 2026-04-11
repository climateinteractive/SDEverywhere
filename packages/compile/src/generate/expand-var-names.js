import * as R from 'ramda'

import { cName } from '../_shared/var-names.js'

import { expandVar } from '../model/expand-var-instances.js'
import Model from '../model/model.js'

/**
 * Return an array of names for all accessible variables, sorted alphabetically and expanded to
 * include the full set of subscripted variants for variables that include subscripts.
 *
 * @param {*} variables The `Variable` objects to process.
 * @param {boolean} canonical If true, convert names to canonical representation (variable identifiers),
 * otherwise return the original name of each variable as it appears in the model.
 * @returns {string[]} An array of variable names or identifiers.
 */
export function expandVarNames(canonical) {
  const sortedVars = R.sortBy(v => v.varName, Model.variables)
  return R.uniq(
    R.reduce(
      (a, v) => {
        if (v.varType !== 'lookup' && v.varType !== 'data' && v.includeInOutput) {
          const varInstances = expandVar(v)
          const varNames = varInstances.map(instance => instance.varName)
          if (canonical) {
            return R.concat(a, R.map(cName, varNames))
          } else {
            return R.concat(a, varNames)
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
