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
export function generateNpvVariables(v, callExpr, context) {
  // Get the text representation of each argument expression
  // TODO: Maybe we could skip this step if we built trees for each generated equation instead
  // of reparsing
  const args = callExpr.args.map(toPrettyString)
  const argStream = args[0]
  const argDiscountRate = args[1]
  const argInitVal = args[2]
  const argFactor = args[3]

  // TODO: Generate subscripts
  // const subs = this.genSubs(stream, discountRate, initVal, factor)
  const subs = ''

  // Build an array of equation strings; variables will be defined for these at the
  // end of this step once all equations are known
  const eqns = []

  // Level 1:
  //   df = INTEG((-df * discount rate) / (1 + discount rate * TIME STEP), 1)
  const dfVarName = newLevelVarName()
  const dfVarId = canonicalName(dfVarName)
  const dfLHS = `${dfVarName}${subs}`
  // TODO: There should be parens around the `discount rate` argument in case it is an expression
  // and not a simple constant
  const dfEqn = `${dfLHS} = INTEG((-${dfLHS} * ${argDiscountRate}) / (1 + ${argDiscountRate} * TIME STEP), 1) ~~|`
  eqns.push(dfEqn)

  // Level 2:
  //   ncum = INTEG(stream * df, init val)
  const ncumVarName = newLevelVarName()
  const ncumVarId = canonicalName(ncumVarName)
  const ncumLHS = `${ncumVarName}${subs}`
  const ncumEqn = `${ncumLHS} = INTEG(${argStream} * ${dfLHS}, ${argInitVal}) ~~|`
  eqns.push(ncumEqn)

  // Aux:
  //   npv = (ncum + stream * TIME STEP * df) * factor
  const auxVarName = newAuxVarName()
  const auxVarId = canonicalName(auxVarName)
  const auxLHS = `${auxVarName}${subs}`
  // TODO: There should be parens around the `stream` argument in case it is an expression
  // and not a simple constant
  const auxEqn = `${auxLHS} = (${ncumVarName} + ${argStream} * TIME STEP * ${dfVarName}) * ${argFactor} ~~|`
  eqns.push(auxEqn)
  v.npvVarName = auxVarId

  // Add references to the generated variables
  // TODO: These are added in a different order than how the variables were defined because
  // this is the order that the legacy reader used, and we're trying to be compatible
  context.addVarReference(ncumVarId)
  context.addVarReference(dfVarId)
  context.addVarReference(auxVarId)

  // Add the generated variables to the model
  context.defineVariables(eqns)

  // TODO: Check on this comment from the legacy reader to see if it's still applicable:
  // If they have subscripts, the refIds are still just the var name, because they are apply-to-all arrays.
}
