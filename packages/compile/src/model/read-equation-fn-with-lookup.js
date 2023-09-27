import { toPrettyString } from '@sdeverywhere/parse'
import { canonicalName, newLookupVarName } from '../_shared/helpers'

/**
 * Generate a lookup definition to augment a `WITH LOOKUP` function call.
 *
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 * @returns
 */
export function generateLookup(v, callExpr, context) {
  // Extract the lookup data from the second argument
  const lookupArg = callExpr.args[1]
  if (lookupArg.kind !== 'lookup-def') {
    throw new Error(`Expected lookup data as second argument in WITH LOOKUP call, but got ${lookupArg.kind}`)
  }

  // Generate a new lookup variable using the data points from the lookup argument
  const lookupVarName = newLookupVarName()
  const lookupDef = toPrettyString(lookupArg, { compact: true })
  const lookupEqn = `${lookupVarName}${lookupDef} ~~|`
  context.defineVariable(lookupEqn)

  // Keep track of all lookup variables that are referenced.  This will be used later to decide
  // whether a lookup variable needs to be included in generated code.
  const lookupArgVarName = canonicalName(lookupVarName)
  v.lookupArgVarName = lookupArgVarName
  if (v.referencedLookupVarNames) {
    v.referencedLookupVarNames.push(lookupArgVarName)
  } else {
    v.referencedLookupVarNames = [lookupArgVarName]
  }
}
