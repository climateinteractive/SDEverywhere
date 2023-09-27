import { toPrettyString } from '@sdeverywhere/parse'

import { canonicalName, newAuxVarName, newLevelVarName } from '../_shared/helpers.js'

/**
 * Generate two level variables and one aux that implement an `NPV` function call.
 *
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 * @returns
 */
export function generateTrendVariables(v, callExpr, context) {
  // Get the text representation of each argument expression
  const args = callExpr.args.map(toPrettyString)
  const argInput = args[0]
  const argAvgTime = args[1]
  const argInitVal = args[2]

  // Generate the subscripts that will be used on the LHS of the generated variables
  // by examining the subscripts of the variables used in arguments to the `TREND` call
  const subs = context.extractSubscriptsFromVarNames(argInput, argAvgTime, argInitVal)

  // Generate a level variable that will be used in place of the `TREND` call
  const levelVarName = newLevelVarName()
  const levelLHS = `${levelVarName}${subs}`
  // TODO: There should be parens around the arguments in this equation in case any of them
  // is an expression and not a simple constant
  const levelEqn = `${levelLHS} = INTEG((${argInput} - ${levelLHS}) / ${argAvgTime}, ${argInput} / (1 + ${argInitVal} * ${argAvgTime})) ~~|`
  context.defineVariable(levelEqn)
  context.addVarReference(canonicalName(levelVarName))

  // Generate a aux variable that will be used in place of the `TREND` call
  const auxVarName = newAuxVarName()
  const auxLHS = `${auxVarName}${subs}`
  // TODO: There should be parens around the arguments in this equation in case any of them
  // is an expression and not a simple constant
  const auxEqn = `${auxLHS} = ZIDZ(${argInput} - ${levelLHS}, ${argAvgTime} * ABS(${levelLHS})) ~~|`
  context.defineVariable(auxEqn)
  v.trendVarName = canonicalName(auxVarName)
  context.addVarReference(v.trendVarName)
}
