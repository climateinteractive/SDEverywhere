import { toPrettyString } from '@sdeverywhere/parse'

import { canonicalName, newLevelVarName } from '../_shared/helpers.js'

/**
 * Generate level and aux variables that implement one of the following `SMOOTH` function
 * call variants:
 * - SMOOTH
 * - SMOOTHI
 * - SMOOTH3
 * - SMOOTH3I
 *
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 * @returns
 */
export function generateSmoothVariables(v, callExpr, context) {
  // Get the text representation of each argument expression
  const args = callExpr.args.map(toPrettyString)
  const argInput = args[0]
  const argDelay = args[1]

  let initVal
  if (args.length === 3) {
    // Use the explicit initial value argument
    initVal = args[2]
  } else {
    // Use the input argument as the initial value
    initVal = args[0]
  }

  // If the LHS includes subscripts, use those same subscripts when generating
  // the new level and aux variables
  let subs
  if (context.eqnLHS.varRef.subscriptRefs) {
    const subNames = context.eqnLHS.varRef.subscriptRefs.map(subRef => subRef.subName)
    subs = `[${subNames.join(',')}]`
  } else {
    subs = ''
  }

  function generateSmoothLevel(input, delay, init) {
    const levelVarBaseName = newLevelVarName()
    const levelVarRefId = canonicalName(levelVarBaseName)
    const levelVarName = `${levelVarBaseName}${subs}`
    const levelEqn = `${levelVarName} = INTEG((${input} - ${levelVarName}) / ${delay}, ${init}) ~~|`
    context.defineVariable(levelEqn)
    context.addVarReference(levelVarRefId)
    return [levelVarBaseName, levelVarName]
  }

  const fnId = callExpr.fnId
  if (fnId === '_SMOOTH' || fnId === '_SMOOTHI') {
    // Generate 1 level variable that will replace the `SMOOTH[I]` function call
    const levelVarName = generateSmoothLevel(argInput, argDelay, initVal)
    // For `SMOOTH[I]`, the smoothVarRefId is the level var's base refId
    v.smoothVarRefId = canonicalName(levelVarName[0])
  } else {
    // Generate 3 level variables that will replace the `SMOOTH3[I]` function call
    const delay3Val = `(${argDelay} / 3)`
    const level1VarName = generateSmoothLevel(argInput, delay3Val, initVal)
    const level2VarName = generateSmoothLevel(level1VarName[1], delay3Val, initVal)
    const level3VarName = generateSmoothLevel(level2VarName[1], delay3Val, initVal)
    // For `SMOOTH3[I]`, the smoothVarRefId is the final level var's base refId
    v.smoothVarRefId = canonicalName(level3VarName[0])
  }
}
