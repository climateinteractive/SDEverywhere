import { toPrettyString } from '@sdeverywhere/parse'

import {
  canonicalName,
  canonicalVensimName,
  decanonicalize,
  isSeparatedVar,
  newAuxVarName,
  newLevelVarName
} from '../_shared/helpers.js'

import { separatedVariableIndex } from '../_shared/subscript.js'

import Model from './model.js'

/**
 * Generate level and aux variables that implement one of the following `DELAY` function
 * call variants:
 * - DELAY1
 * - DELAY1I
 * - DELAY3
 * - DELAY3I
 *
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 */
export function generateDelayVariables(v, callExpr, context) {
  // Get the text representation of each argument expression
  // TODO: Maybe we could skip this step if we built trees for each generated equation instead
  // of reparsing
  const args = callExpr.args.map(toPrettyString)
  let argInput = args[0]
  let argDelay = args[1]

  let argInit
  if (args.length === 3) {
    // Use the explicit initial value argument
    argInit = `${args[2]}`
  } else {
    // Use the input argument as the initial value
    argInit = `${argInput}`
  }

  // If the LHS includes subscripts, use those same subscripts when generating
  // the new level and aux variables
  let subs
  if (context.eqnLhs.varDef.subscriptRefs) {
    const subNames = context.eqnLhs.varDef.subscriptRefs.map(subRef => subRef.subName)
    subs = `[${subNames.join(',')}]`
  } else {
    subs = ''
  }

  const fnId = callExpr.fnId
  if (fnId === '_DELAY1' || fnId === '_DELAY1I') {
    // Generate 1 level and 1 aux variable that will replace the `DELAY1[I]` function call
    if (isSeparatedVar(v)) {
      // The LHS variable is separated, so we need to generate separated level variable instances
      generateDelay1VarsForSeparatedVar(v, context, subs, argInput, argDelay, argInit)
    } else {
      // The LHS variable is normal (non-separated or apply-to-all), so we can create a single
      // level variable instance
      generateDelay1VarsForNormalVar(v, context, subs, argInput, argDelay, argInit)
    }
  } else {
    // Generate 3 level variables and 4 aux variables that will replace the `DELAY3[I]`
    // function call
    if (isSeparatedVar(v)) {
      // The LHS variable is separated, so we need to generate multiple sets of separated level
      // variable instances
      generateDelay3VarsForSeparatedVar(v, context, subs, argInput, argDelay, argInit)
    } else {
      // The LHS variable is normal (non-separated or apply-to-all), so we can create a single
      // set of level variable instances
      generateDelay3VarsForNormalVar(v, context, subs, argInput, argDelay, argInit)
    }
  }
}

/**
 * Generate equation text for a single level variable that is used to implement a `DELAY`
 * function call, and add a reference to `levelRefId`.
 */
function generateDelayLevel(context, levelLHS, levelRefId, input, aux, init) {
  const levelEqn = `${levelLHS} = INTEG(${input} - ${aux}, ${init}) ~~|`
  context.addVarReference(levelRefId)
  return levelEqn
}

//
// DELAY1[I]
//

/**
 * Generate and define variables that are needed to implement a `DELAY1[I]` function call
 * for a non-subscripted or apply-to-all variable.
 */
function generateDelay1VarsForNormalVar(v, context, subs, argInput, argDelay, argInit) {
  // Generate a single level variable instance
  const varLHS = v.modelLHS
  const levelVarBaseName = newLevelVarName()
  const levelVarRefId = canonicalName(levelVarBaseName)
  const levelLHS = `${levelVarBaseName}${subs}`

  // Generate the equation text for the delay level variable
  const eqns = []
  // TODO: There should be parens around the factors in this init expression
  const argInitTimesDelay = `${argInit} * ${argDelay}`
  eqns.push(generateDelayLevel(context, levelLHS, levelVarRefId, argInput, varLHS, argInitTimesDelay))
  v.delayVarRefId = levelVarRefId

  // Generate an aux variable to hold the delay time expression
  eqns.push(generateDelay1Aux(v, context, subs, argDelay))

  // Add the generated variables to the model
  context.defineVariables(eqns)
}

/**
 * Generate and define variables that are needed to implement a `DELAY1[I]` function call
 * for a non-apply-to-all variable.
 */
function generateDelay1VarsForSeparatedVar(v, context, subs, argInput, argDelay, argInit) {
  // XXX: This code that deals with separated variables is largely copied from the legacy
  // `equation-reader.js` and modified to work with the AST instead of directly depending
  // on antlr4-vensim constructs.  This logic is pretty complex so we should try to refactor
  // or at least add some more fine-grained unit tests for it.
  let varLHS = v.modelLHS

  const levelVarBaseName = newLevelVarName(v.varName, 1)
  let index
  let sepDim
  let r = subs.match(/\[(.*)\]/)
  if (r) {
    let rhsSubs = r[1].split(',').map(canonicalName)
    for (let rhsSub of rhsSubs) {
      let separatedIndexName = separatedVariableIndex(rhsSub, v, rhsSubs)
      if (separatedIndexName) {
        index = decanonicalize(separatedIndexName)
        sepDim = decanonicalize(rhsSub)
        break
      }
    }
  }

  if (index) {
    let re = new RegExp(sepDim, 'gi')
    subs = subs.replace(re, index)
    varLHS = varLHS.replace(re, index)
    argInput = argInput.replace(re, index)
    argDelay = argDelay.replace(re, index)
    argInit = argInit.replace(re, index)
  }

  const levelLHS = `${levelVarBaseName}${subs}`
  const levelVarRefId = canonicalVensimName(levelLHS)
  Model.addNonAtoAVar(canonicalName(levelVarBaseName), [true])

  // Generate the equation text for the delay level variable
  const eqns = []
  // TODO: There should be parens around the factors in this init expression
  const argInitTimesDelay = `${argInit} * ${argDelay}`
  eqns.push(generateDelayLevel(context, levelLHS, levelVarRefId, argInput, varLHS, argInitTimesDelay))
  v.delayVarRefId = levelVarRefId

  // Generate an aux variable to hold the delay time expression
  eqns.push(generateDelay1Aux(v, context, subs, argDelay))

  // Add the generated variables to the model
  context.defineVariables(eqns)
}

/**
 * Generate equation text for a single "delay time" aux variable that is used to implement
 * a `DELAY1[I]` function call, and add a reference to the delay time variable.
 */
function generateDelay1Aux(v, context, subs, argDelay) {
  const delayTimeVarName = newAuxVarName()
  const delayTimeLHS = `${delayTimeVarName}${subs}`
  const delayTimeVarRefId = canonicalVensimName(delayTimeLHS)

  v.delayTimeVarName = canonicalName(delayTimeVarName)
  if (isSeparatedVar(v)) {
    // Note: We need to mark this generated aux variable as non-apply-to-all before
    // we define it with `defineVariable` so that the refId is computed correctly
    Model.addNonAtoAVar(v.delayTimeVarName, [true])
  }

  const delayTimeEqn = `${delayTimeLHS} = ${argDelay} ~~|`
  context.addVarReference(delayTimeVarRefId)
  return delayTimeEqn
}

//
// DELAY3[I]
//

/**
 * Generate and define variables that are needed to implement a `DELAY3[I]` function call
 * for a non-subscripted or apply-to-all variable.
 */
function generateDelay3VarsForNormalVar(v, context, subs, argInput, argDelay, argInit) {
  // Generate names for the 3 level variables and 4 aux variables
  const level1 = newLevelVarName()
  const level2 = newLevelVarName()
  const level3 = newLevelVarName()
  const aux1 = newAuxVarName()
  const aux2 = newAuxVarName()
  const aux3 = newAuxVarName()
  const aux4 = newAuxVarName()
  const level1LHS = `${level1}${subs}`
  const level2LHS = `${level2}${subs}`
  const level3LHS = `${level3}${subs}`
  const aux1LHS = `${aux1}${subs}`
  const aux2LHS = `${aux2}${subs}`
  const aux3LHS = `${aux3}${subs}`
  const aux4LHS = `${aux4}${subs}`
  const level1RefId = canonicalName(level1)
  const level2RefId = canonicalName(level2)
  const level3RefId = canonicalName(level3)

  // Generate level variables
  const eqns = []
  const delay3Val = `((${argDelay}) / 3)`
  // TODO: There should be parens around these factors
  const initArg = `${argInit} * ${delay3Val}`
  eqns.push(generateDelayLevel(context, level3LHS, level3RefId, aux2LHS, aux3LHS, initArg))
  eqns.push(generateDelayLevel(context, level2LHS, level2RefId, aux1LHS, aux2LHS, initArg))
  eqns.push(generateDelayLevel(context, level1LHS, level1RefId, argInput, aux1LHS, initArg))
  v.delayVarRefId = canonicalName(level3)

  // Generate aux variable equations using the subs in the generated level vars
  eqns.push(`${aux1LHS} = ${level1LHS} / ${delay3Val} ~~|`)
  eqns.push(`${aux2LHS} = ${level2LHS} / ${delay3Val} ~~|`)
  eqns.push(`${aux3LHS} = ${level3LHS} / ${delay3Val} ~~|`)

  // Generate an aux variable to hold the delay time expression
  v.delayTimeVarName = canonicalName(aux4)
  const delayTimeVarRefId = canonicalVensimName(aux4LHS)
  eqns.push(`${aux4LHS} = ${delay3Val} ~~|`)
  context.addVarReference(delayTimeVarRefId)

  // Add the generated variables to the model
  context.defineVariables(eqns)
}

/**
 * Generate and define variables that are needed to implement a `DELAY3[I]` function call
 * for a non-apply-to-all variable.
 */
function generateDelay3VarsForSeparatedVar(v, context, subs, argInput, argDelay, argInit) {
  // XXX: This code that deals with separated variables is largely copied from the legacy
  // `equation-reader.js` and modified to work with the AST instead of directly depending
  // on antlr4-vensim constructs.  This logic is pretty complex so we should try to refactor
  // or at least add some more fine-grained unit tests for it.

  // Generate names for the 3 level variables and 4 aux variables
  const level1 = newLevelVarName(v.varName, 1)
  const level2 = newLevelVarName(v.varName, 2)
  const level3 = newLevelVarName(v.varName, 3)
  const aux1 = newAuxVarName(v.varName, 1)
  const aux2 = newAuxVarName(v.varName, 2)
  const aux3 = newAuxVarName(v.varName, 3)
  const aux4 = newAuxVarName(v.varName, 4)

  let index
  let sepDim
  let r = subs.match(/\[(.*)\]/)
  if (r) {
    let rhsSubs = r[1].split(',').map(x => canonicalName(x))
    for (let rhsSub of rhsSubs) {
      let separatedIndexName = separatedVariableIndex(rhsSub, v, rhsSubs)
      if (separatedIndexName) {
        index = decanonicalize(separatedIndexName)
        sepDim = decanonicalize(rhsSub)
        break
      }
    }
  }

  let delay3Val = `((${argDelay}) / 3)`
  if (index) {
    let re = new RegExp(sepDim, 'gi')
    subs = subs.replace(re, index)
    argInput = argInput.replace(re, index)
    argInit = argInit.replace(re, index)
    delay3Val = delay3Val.replace(re, index)
  }

  // TODO: There should be parens around these factors
  const initArg = `${argInit} * ${delay3Val}`

  const level1LHS = `${level1}${subs}`
  const level2LHS = `${level2}${subs}`
  const level3LHS = `${level3}${subs}`

  const aux1LHS = `${aux1}${subs}`
  const aux2LHS = `${aux2}${subs}`
  const aux3LHS = `${aux3}${subs}`
  const aux4LHS = `${aux4}${subs}`

  const level1RefId = canonicalVensimName(level1LHS)
  const level2RefId = canonicalVensimName(level2LHS)
  const level3RefId = canonicalVensimName(level3LHS)

  Model.addNonAtoAVar(canonicalName(level1), [true])
  Model.addNonAtoAVar(canonicalName(level2), [true])
  Model.addNonAtoAVar(canonicalName(level3), [true])

  Model.addNonAtoAVar(canonicalName(aux1), [true])
  Model.addNonAtoAVar(canonicalName(aux2), [true])
  Model.addNonAtoAVar(canonicalName(aux3), [true])

  // Generate level variables
  const eqns = []
  eqns.push(generateDelayLevel(context, level3LHS, level3RefId, aux2LHS, aux3LHS, initArg))
  eqns.push(generateDelayLevel(context, level2LHS, level2RefId, aux1LHS, aux2LHS, initArg))
  eqns.push(generateDelayLevel(context, level1LHS, level1RefId, argInput, aux1LHS, initArg))
  v.delayVarRefId = level3RefId

  // Generate aux variable equations using the subs in the generated level vars
  eqns.push(`${aux1LHS} = ${level1LHS} / ${delay3Val} ~~|`)
  eqns.push(`${aux2LHS} = ${level2LHS} / ${delay3Val} ~~|`)
  eqns.push(`${aux3LHS} = ${level3LHS} / ${delay3Val} ~~|`)

  // Generate an aux variable to hold the delay time expression
  v.delayTimeVarName = canonicalName(aux4)
  Model.addNonAtoAVar(v.delayTimeVarName, [true])
  const delayTimeVarRefId = canonicalVensimName(aux4LHS)
  eqns.push(`${aux4LHS} = ${delay3Val} ~~|`)
  context.addVarReference(delayTimeVarRefId)

  // Add the generated variables to the model
  context.defineVariables(eqns)
}
