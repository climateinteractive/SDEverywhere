import { toPrettyString } from '@sdeverywhere/parse'

import {
  canonicalName,
  canonicalVensimName,
  decanonicalize,
  isSeparatedVar,
  newLevelVarName
} from '../_shared/helpers.js'

import { separatedVariableIndex } from '../_shared/subscript.js'

import Model from './model.js'

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

  let argInit
  if (args.length === 3) {
    // Use the explicit initial value argument
    argInit = args[2]
  } else {
    // Use the input argument as the initial value
    argInit = args[0]
  }

  const fnId = callExpr.fnId
  if (fnId === '_SMOOTH' || fnId === '_SMOOTHI') {
    // Generate 1 level variable that will replace the `SMOOTH[I]` function call
    const level = generateSmoothLevel(v, context, argInput, argDelay, argInit, 1)
    // For `SMOOTH[I]`, the smoothVarRefId is the level var's refId
    v.smoothVarRefId = level.varRefId
    // Add the generated variable to the model
    context.defineVariables([level.eqn])
  } else {
    // Generate 3 level variables that will replace the `SMOOTH3[I]` function call
    const delay3Val = `(${argDelay} / 3)`
    const level1 = generateSmoothLevel(v, context, argInput, delay3Val, argInit, 1)
    const level2 = generateSmoothLevel(v, context, level1.varFullName, delay3Val, argInit, 2)
    const level3 = generateSmoothLevel(v, context, level2.varFullName, delay3Val, argInit, 3)
    // For `SMOOTH3[I]`, the smoothVarRefId is the final level var's refId
    v.smoothVarRefId = level3.varRefId
    // Add the generated variables to the model
    context.defineVariables([level1.eqn, level2.eqn, level3.eqn])
  }
}

/**
 * Generate a single level variable that is used to implement a `SMOOTH` function call.
 */
function generateSmoothLevel(v, context, argInput, argDelay, argInit, levelNumber) {
  // XXX: This code that deals with separated variables is largely copied from the legacy
  // `equation-reader.js` and modified to work with the AST instead of directly depending
  // on antlr4-vensim constructs.  This logic is pretty complex so we should try to refactor
  // or at least add some more fine-grained unit tests for it.

  // Preserve the original subscript/dimension names that were passed in.  In the case of
  // separated variables, the `subs` array will be replaced to include the separated subscript
  // names, but we still need the original subscript/dimension names.
  const origSubs = context.extractSubscriptsFromVarNames(argInput, argDelay, argInit)
  let subs = origSubs

  let levelVarBaseName
  let levelLHS
  let levelVarRefId
  if (isSeparatedVar(v)) {
    // Levels generated by separated vars are also separated. We have to compute the indices here instead
    // of using the dimension on the LHS and letting addVariable do it, so that the whole array of
    // separated variables are not added for each visit here by an already-separated index.
    // Start by getting a level var based on the var name, so it is the same for all separated levels.
    levelVarBaseName = newLevelVarName(v.varName, levelNumber)

    // Replace the dimension in the generated variable subscript with the separated index from the LHS.
    // Find the index in the LHS that was expanded from the separation dimension.
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

    // Use the Vensim form of the index in the LHS and in all arguments
    if (index) {
      let re = new RegExp(`\\[(.*?)${sepDim}(.*?)\\]`, 'gi')
      let replacement = `[$1${index}$2]`
      subs = subs.replace(re, replacement)
      argInput = argInput.replace(re, replacement)
      argDelay = argDelay.replace(re, replacement)
      argInit = argInit.replace(re, replacement)
    }
    levelLHS = `${levelVarBaseName}${subs}`
    levelVarRefId = canonicalVensimName(levelLHS)
  } else {
    // In the normal case, generate a unique variable name for the level var
    levelVarBaseName = newLevelVarName()
    levelLHS = `${levelVarBaseName}${subs}`
    // If it has subscripts, the refId is still just the var name, because it is an
    // apply-to-all array
    levelVarRefId = canonicalName(levelVarBaseName)
  }

  // Generate the level variable
  const levelEqn = `${levelLHS} = INTEG((${argInput} - ${levelLHS}) / ${argDelay}, ${argInit}) ~~|`
  if (isSeparatedVar(v)) {
    Model.addNonAtoAVar(canonicalName(levelVarBaseName), [true])
  }
  context.addVarReference(levelVarRefId)

  // The name of the level variable returned here includes the original subscript/dimension names
  // (not the separated subscript names) so that the `argInput` is correct for the 2nd and 3rd levels
  const levelVarFullName = `${levelVarBaseName}${origSubs}`
  return {
    varRefId: levelVarRefId,
    varFullName: levelVarFullName,
    eqn: levelEqn
  }
}
