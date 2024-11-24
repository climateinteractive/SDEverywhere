import { canonicalName } from '../_shared/helpers.js'

/**
 * Generate a lookup variable that can be used to provide inputs to a the `GAME`
 * function at runtime.
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 */
export function generateGameVariables(v, callExpr, context) {
  // If the LHS includes subscripts, use those same subscripts when generating
  // the new lookup variable
  let subs
  if (context.eqnLhs.varDef.subscriptRefs) {
    const subNames = context.eqnLhs.varDef.subscriptRefs.map(subRef => subRef.subName)
    subs = `[${subNames.join(',')}]`
  } else {
    subs = ''
  }

  // Synthesize a lookup variable name that is the same as the LHS variable
  // name with ' game inputs' appended to it
  const gameLookupVarName = context.eqnLhs.varDef.varName + ' game inputs'

  // Add a reference to the synthesized game inputs lookup
  const gameLookupVarId = canonicalName(gameLookupVarName)
  v.gameLookupVarName = gameLookupVarId
  if (v.referencedLookupVarNames) {
    v.referencedLookupVarNames.push(gameLookupVarId)
  } else {
    v.referencedLookupVarNames = [gameLookupVarId]
  }

  // Define a variable for the synthesized game inputs lookup
  const gameLookupVars = context.defineVariables([`${gameLookupVarName}${subs} ~~|`])

  // Normally `defineVariables` sets `includeInOutput` to false for generated
  // variables, but we want the generated lookup variable to appear in the
  // model listing so that the user can reference it, so set `includeInOutput`
  // to true.  Also change the `varType` to 'lookup' instead of 'data'.  We
  // will declare a `Lookup` variable in the generated code, but unlike a
  // normal lookup, we won't initialize it with data by default (it can only
  // be updated at runtime).
  gameLookupVars.forEach(v => {
    v.includeInOutput = true
    v.varType = 'lookup'
    v.varSubtype = 'gameInputs'
  })
}
