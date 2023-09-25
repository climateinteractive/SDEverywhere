import { parseVensimModel, toPrettyString } from '@sdeverywhere/parse'

import {
  canonicalName,
  canonicalVensimName,
  newAuxVarName,
  newDepreciationVarName,
  newFixedDelayVarName,
  newLevelVarName
} from '../_shared/helpers.js'

import Model from './model.js'
import { readVariables } from './read-variables.js'

class Context {
  constructor(refId) {
    // The refId of the variable being processed
    this.refId = refId

    // The array of refIds for variables referenced by this variable (needed at `init` time)
    this.referencedInitVars = []

    // The array of refIds for variables referenced by this variable (needed at `eval` time)
    this.referencedEvalVars = []

    // The call stack "frames" that are pushed when traversing into function call nodes
    this.callStack = []

    // Whether the RHS has something other than a constant
    this.rhsNonConst = false
  }

  addVarReference(varRefId) {
    // Determine whether this is an "init" or "eval" reference
    let mode
    if (this.callStack.length > 0) {
      // We are in a function call.  The top-level function (the one at the bottom of the call
      // stack) determines the mode.
      mode = this.callStack[0].argMode
    } else {
      // We are not in a function call, so use the normal "eval" mode
      mode = 'eval'
    }

    // In Vensim a variable can refer to its current value in the state.
    // Do not add self-references to the lists of references.
    // Do not duplicate references.
    if (mode !== 'none') {
      const vars = mode === 'init' ? this.referencedInitVars : this.referencedEvalVars
      if (varRefId !== this.refId && !vars.includes(varRefId)) {
        vars.push(varRefId)
      }
    }
  }

  enterFunctionCall(fnId) {
    const callFrame = {
      fnId: fnId
    }
    this.callStack.push(callFrame)
  }

  /**
   * Set the index of the arg being evaluated in this call stack frame.
   *
   * @param {number} index The zero-based arg index.
   * @param {'none' | 'init' | 'eval'} mode Whether this is a normal ('eval') arg position,
   * or an 'init' position (like the second "initial" argument in an INTEG call), or 'none'
   * (meaning that the references will not be captured at this position, as is the case when
   * level vars are generated).
   */
  setArgIndex(index, mode = 'eval') {
    const frame = this.callStack[this.callStack.length - 1]
    frame.argIndex = index
    frame.argMode = mode
  }

  exitFunctionCall() {
    this.callStack.pop()
  }

  /**
   * Define a new variable with the given equation.  This will add the variable to the `Model`
   * and then perform the same `readEquation` step that is applied to all other regular variables.
   *
   * @param {*} eqnText The equation in Vensim format.
   */
  defineVariable(eqnText) {
    // Parse the equation text
    const parsedModel = { kind: 'vensim', root: parseVensimModel(eqnText) }

    // Create one or more `Variable` instances from the equation
    const vars = readVariables(parsedModel)

    // Add the variables to the `Model`
    vars.forEach(v => Model.addVariable(v))

    vars.forEach(v => {
      // Define the refId for the variable
      v.refId = Model.refIdForVar(v)

      // Process each variable using the same process as above
      readEquation(v)

      // Inhibit output for generated variables
      v.includeInOutput = false
    })
  }
}

/**
 * TODO: Docs
 *
 * @param v The `Variable` instance to process.
 */
export function readEquation(v) {
  const eqn = v.parsedEqn
  const context = new Context(v.refId)

  // Visit the RHS of the equation.  If the equation is undefined, it is a synthesized
  // variable (e.g., `Time`), in which case we skip this step.
  if (eqn) {
    const rhs = eqn.rhs
    switch (rhs.kind) {
      case 'expr':
        visitExpr(v, rhs.expr, context)
        break
      case 'lookup':
        visitLookupDef(v, rhs.lookupDef)
        break
      case 'const-list':
        // TODO
        break
      case 'data':
        // Nothing to do here
        break
      default:
        throw new Error(`Unhandled equation kind '${rhs.kind}'`)
    }
  }

  // Update the variable state
  if (context.referencedInitVars.length > 0) {
    v.initReferences = context.referencedInitVars
  }
  if (context.referencedEvalVars.length > 0) {
    v.references = context.referencedEvalVars
  }

  // Refine the variable type based on the contents of the equation
  if (v.points.length > 0) {
    v.varType = 'lookup'
  } else if (v.isAux() && !context.rhsNonConst) {
    v.varType = 'const'
  }
}

/**
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} expr
 * @param {*} context
 */
function visitExpr(v, expr, context) {
  switch (expr.kind) {
    case 'number':
    case 'keyword':
      break

    case 'variable-ref':
      visitVariableRef(v, expr, context)
      break

    case 'unary-op':
      visitExpr(v, expr.expr, context)
      break

    case 'binary-op':
      visitExpr(v, expr.lhs, context)
      visitExpr(v, expr.rhs, context)
      break

    case 'parens':
      visitExpr(v, expr.expr, context)
      break

    case 'lookup-def':
      visitLookupDef(v, expr)
      break

    case 'lookup-call':
      visitLookupCall(v, expr, context)
      break

    case 'function-call':
      visitFunctionCall(v, expr, context)
      break

    default:
      throw new Error(`Unhandled expression kind '${expr.kind}' when reading ${v.modelLHS}`)
  }
}

/**
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} varRefExpr
 * @param {*} context
 */
function visitVariableRef(v, varRefExpr, context) {
  // Mark the RHS as non-constant, since it has a variable reference
  context.rhsNonConst = true

  // Add this variable to the list of referenced variables
  context.addVarReference(varRefExpr.varId)
}

/**
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} def
 * @param {*} context
 */
function visitLookupDef(v, def) {
  // Save the lookup range and points to the variable
  if (def.range) {
    v.range = [def.range.min, def.range.max]
  }
  v.points = def.points
}

/**
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 */
function visitLookupCall(v, callExpr, context) {
  // Mark the RHS as non-constant, since it has a lookup call
  context.rhsNonConst = true
}

/**
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 */
function visitFunctionCall(v, callExpr, context) {
  // Mark the RHS as non-constant, since it has a function call
  context.rhsNonConst = true

  // Enter this function call
  context.enterFunctionCall(callExpr.fnId)

  // By default, all arguments are assumed to be used at eval time, but certain functions
  // will override this and mark specific argument positions as being used at init time
  let argModes = Array(callExpr.args.length).fill('eval')

  switch (callExpr.fnId) {
    case '_ACTIVE_INITIAL':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 2)
      v.hasInitValue = true
      // The 2nd argument is used at init time
      argModes[1] = 'init'
      break

    case '_INITIAL':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 1)
      v.varType = 'initial'
      v.hasInitValue = true
      // The single argument is used at init time
      argModes[0] = 'init'
      break

    case '_DELAY1':
    case '_DELAY1I':
      validateCallArgs(callExpr, callExpr.fnId === '_DELAY1I' ? 3 : 2)
      // Don't set references inside the call, since the arguments will be referenced by new
      // generated vars
      for (let i = 0; i < argModes.length; i++) {
        argModes[i] = 'none'
      }
      generateDelay1Variables(v, callExpr, context)
      break

    case '_DELAY_FIXED':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 3)
      v.varType = 'level'
      v.varSubtype = 'fixedDelay'
      v.hasInitValue = true
      v.fixedDelayVarName = canonicalName(newFixedDelayVarName())
      // The 2nd and 3rd arguments are used at init time
      argModes[1] = 'init'
      argModes[2] = 'init'
      break

    case '_DEPRECIATE_STRAIGHTLINE':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 4)
      v.varSubtype = 'depreciation'
      v.hasInitValue = true
      v.depreciationVarName = canonicalName(newDepreciationVarName())
      // The 2nd and 3rd arguments are used at init time
      // TODO: The 3rd (fisc) argument is not currently supported
      // TODO: Shouldn't the last (init) argument be marked as 'init' here?  (It's
      // not treated as 'init' in the legacy reader.)
      argModes[1] = 'init'
      argModes[2] = 'init'
      break

    case '_INTEG':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 2)
      v.varType = 'level'
      v.hasInitValue = true
      // The 2nd argument is used at init time
      argModes[1] = 'init'
      break

    case '_NPV':
      validateCallArgs(callExpr, 4)
      // Don't set references inside the call, since the arguments will be referenced by new
      // generated vars
      for (let i = 0; i < argModes.length; i++) {
        argModes[i] = 'none'
      }
      generateNpvVariables(v, callExpr, context)
      break

    case '_SAMPLE_IF_TRUE':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 3)
      v.hasInitValue = true
      // The 3rd argument is used at init time
      argModes[2] = 'init'
      break

    default:
      // TODO: Show a warning if the function is not yet implemented in SDE (and is not explicitly
      // declared as a user-implemented macro)
      break
  }

  // XXX: The legacy reader skips this step for certain functions, so we will do the same for now
  let addToReferenced = true
  switch (callExpr.fnId) {
    case '_IF_THEN_ELSE':
    case '_DELAY1':
    case '_DELAY1I':
    case '_NPV':
      addToReferenced = false
      break
    default:
      break
  }
  if (addToReferenced) {
    // Keep track of all function names referenced in this expression.  Note that lookup
    // variables are sometimes function-like, so they will be included here.  This will be
    // used later to decide whether a lookup variable needs to be included in generated code.
    // TODO: The legacy `EquationReader` used `canonicalName` redundantly, which caused an
    // extra leading underscore.  We will do the same here for compatibility but this should
    // be fixed after the legacy reader is removed.
    const fnId = `_${callExpr.fnId.toLowerCase()}`
    if (v.referencedFunctionNames) {
      if (!v.referencedFunctionNames.includes(fnId)) {
        v.referencedFunctionNames.push(fnId)
      }
    } else {
      v.referencedFunctionNames = [fnId]
    }
  }

  // Visit each argument
  for (const [index, argExpr] of callExpr.args.entries()) {
    context.setArgIndex(index, argModes[index])
    visitExpr(v, argExpr, context)
  }

  // Exit this function call
  context.exitFunctionCall()
}

/**
 * Throw an error if the given function call does not appear at the top level of an equation RHS
 * (i.e., right after the equals sign).
 */
function validateCallDepth(callExpr, context) {
  if (context.callStack.length !== 1) {
    throw new Error(
      `Function '${callExpr.fnName}' cannot be used inside other function calls (it must appear directly after the '=' sign in an equation)`
    )
  }
}

/**
 * Throw an error if the given function call does not have the expected number of arguments.
 */
function validateCallArgs(callExpr, expectedArgCount) {
  if (callExpr.args.length !== expectedArgCount) {
    throw new Error(
      `Expected '${callExpr.fnName}' function call to have ${expectedArgCount} arguments but got ${callExpr.args.length} `
    )
  }
}

/**
 * Generate level and aux variables that implement an `DELAY1` or `DELAY1I` function call.
 *
 * TODO: Docs
 *
 * @param {*} v
 * @param {*} callExpr
 * @param {*} context
 * @returns
 */
function generateDelay1Variables(v, callExpr, context) {
  // Get the text representation of each argument expression
  // TODO: Maybe we could skip this step if we built trees for each generated equation instead
  // of reparsing
  const args = callExpr.args.map(toPrettyString)
  const argInput = args[0]
  const argDelay = args[1]

  let initVal
  if (args.length === 3) {
    // Use the explicit initial value argument
    // TODO: There should be parens around these
    initVal = `${args[2]} * ${argDelay}`
  } else {
    // Use the input argument as the initial value
    // TODO: There should be parens around these
    initVal = `${argInput} * ${argDelay}`
  }

  // TODO: Generate subscripts
  // const subs = this.genSubs(v.modelLHS)
  const subs = '[DimA]'

  // let level, levelLHS, levelRefId
  // let init = `${args[2] !== undefined ? args[2] : args[0]} * ${delay}`
  // let varLHS = this.var.modelLHS
  //
  // TODO: Separated
  // if (isSeparatedVar(this.var)) {
  //   level = newLevelVarName(this.var.varName, 1)
  //   let index
  //   let sepDim
  //   let r = genSubs.match(/\[(.*)\]/)
  //   if (r) {
  //     let rhsSubs = r[1].split(',').map(x => canonicalName(x))
  //     for (let rhsSub of rhsSubs) {
  //       let separatedIndexName = separatedVariableIndex(rhsSub, this.var, rhsSubs)
  //       if (separatedIndexName) {
  //         index = decanonicalize(separatedIndexName)
  //         sepDim = decanonicalize(rhsSub)
  //         break
  //       }
  //     }
  //   }
  //   if (index) {
  //     let re = new RegExp(sepDim, 'gi')
  //     genSubs = genSubs.replace(re, index)
  //     levelLHS = `${level}${genSubs}`
  //     levelRefId = canonicalVensimName(levelLHS)
  //     input = input.replace(re, index)
  //     varLHS = varLHS.replace(re, index)
  //     delay = delay.replace(re, index)
  //     init = init.replace(re, index)
  //   }
  //   Model.addNonAtoAVar(canonicalName(level), [true])
  // }
  //
  // TODO: Not separated
  //   level = newLevelVarName()
  //   levelLHS = level + genSubs
  //   levelRefId = canonicalName(level)
  // }
  //

  /**
   * Generate a level equation to implement a `DELAY*` function call.
   *
   * TODO: Docs
   *
   * @param {*} levelLHS
   * @param {*} levelRefId
   * @param {*} input
   * @param {*} aux
   * @param {*} init
   * @returns The refId for the generated level variable.
   */
  function generateDelayLevel(levelLHS, levelRefId, input, aux, init) {
    const levelEqn = `${levelLHS} = INTEG(${input} - ${aux}, ${init}) ~~|`
    context.defineVariable(levelEqn)
    context.addVarReference(levelRefId)
  }

  // Generate a level variable that will replace the `DELAY` function call
  const levelVarName = newLevelVarName()
  const levelVarRefId = canonicalName(levelVarName)
  const levelLHS = `${levelVarName}${subs}`
  generateDelayLevel(levelLHS, levelVarRefId, argInput, v.modelLHS, initVal)
  v.delayVarRefId = levelVarRefId

  // Generate an aux variable to hold the delay time expression
  const delayTimeVarName = newAuxVarName()
  // TODO: Separated
  // if (isSeparatedVar(this.var)) {
  //   Model.addNonAtoAVar(this.var.delayTimeVarName, [true])
  // }
  const delayTimeLHS = `${delayTimeVarName}${subs}`
  const delayTimeVarRefId = canonicalVensimName(delayTimeLHS)
  const delayTimeEqn = `${delayTimeLHS} = ${argDelay} ~~|`
  context.defineVariable(delayTimeEqn)
  context.addVarReference(delayTimeVarRefId)
  v.delayTimeVarName = canonicalName(delayTimeVarName)
}

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
function generateNpvVariables(v, callExpr, context) {
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

  // Level 1:
  //   df = INTEG((-df * discount rate) / (1 + discount rate * TIME STEP), 1)
  const dfVarName = newLevelVarName()
  const dfVarId = canonicalName(dfVarName)
  const dfLHS = `${dfVarName}${subs}`
  // TODO: There should be parens around the `discount rate` argument in case it is an expression
  // and not a simple constant
  const dfEqn = `${dfLHS} = INTEG((-${dfLHS} * ${argDiscountRate}) / (1 + ${argDiscountRate} * TIME STEP), 1) ~~|`
  context.defineVariable(dfEqn)

  // Level 2:
  //   ncum = INTEG(stream * df, init val)
  const ncumVarName = newLevelVarName()
  const ncumVarId = canonicalName(ncumVarName)
  const ncumLHS = `${ncumVarName}${subs}`
  const ncumEqn = `${ncumLHS} = INTEG(${argStream} * ${dfLHS}, ${argInitVal}) ~~|`
  context.defineVariable(ncumEqn)

  // Aux:
  //   npv = (ncum + stream * TIME STEP * df) * factor
  const auxVarName = newAuxVarName()
  const auxVarId = canonicalName(auxVarName)
  const auxLHS = `${auxVarName}${subs}`
  // TODO: There should be parens around the `stream` argument in case it is an expression
  // and not a simple constant
  const auxEqn = `${auxLHS} = (${ncumVarName} + ${argStream} * TIME STEP * ${dfVarName}) * ${argFactor} ~~|`
  context.defineVariable(auxEqn)
  v.npvVarName = auxVarId

  // Add references to the generated variables
  // TODO: These are added in a different order than how the variables were defined because
  // this is the order that the legacy reader used, and we're trying to be compatible
  context.addVarReference(ncumVarId)
  context.addVarReference(dfVarId)
  context.addVarReference(auxVarId)

  // TODO: Check on this comment from the legacy reader to see if it's still applicable:
  // If they have subscripts, the refIds are still just the var name, because they are apply-to-all arrays.
}
