import * as R from 'ramda'

import { parseVensimModel } from '@sdeverywhere/parse'

import { canonicalName, cartesianProductOf, newDepreciationVarName, newFixedDelayVarName } from '../_shared/helpers.js'

import {
  extractMarkedDims,
  indexNamesForSubscript,
  isDimension,
  isIndex,
  separatedVariableIndex,
  sub
} from '../_shared/subscript.js'

import Model from './model.js'
import { generateDelayVariables } from './read-equation-fn-delay.js'
import { generateGameVariables } from './read-equation-fn-game.js'
import { generateNpvVariables } from './read-equation-fn-npv.js'
import { generateSmoothVariables } from './read-equation-fn-smooth.js'
import { generateTrendVariables } from './read-equation-fn-trend.js'
import { generateLookup } from './read-equation-fn-with-lookup.js'
import { readVariables } from './read-variables.js'

class Context {
  constructor(eqnLhs, refId) {
    // The LHS of the equation being processed
    this.eqnLhs = eqnLhs

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
    const vars = mode === 'init' ? this.referencedInitVars : this.referencedEvalVars
    if (varRefId !== this.refId && !vars.includes(varRefId)) {
      vars.push(varRefId)
    }
  }

  enterFunctionCall(fnId) {
    const callFrame = {
      fnId: fnId
    }
    this.callStack.push(callFrame)
  }

  exitFunctionCall() {
    this.callStack.pop()
  }

  /**
   * Return the function ID for the parent call.  For example, for the following:
   *   SMOOTH(x, MAX(y, z))
   * If this is called while evaluating `x`, then this function will return `_SMOOTH`.
   * If this is called while evaluating `y`, then this function will return `_MAX`.
   */
  getParentFnId() {
    if (this.callStack.length > 1) {
      return this.callStack[this.callStack.length - 2].fnId
    } else {
      return undefined
    }
  }

  /**
   * Set the index of the arg being evaluated in this call stack frame.
   *
   * @param {number} index The zero-based arg index.
   * @param {'init' | 'eval'} mode Whether this is a normal ('eval') arg position,
   * or an 'init' position (like the second "initial" argument in an INTEG call).
   */
  setArgIndex(index, mode = 'eval') {
    const frame = this.callStack[this.callStack.length - 1]
    frame.argIndex = index
    frame.argMode = mode
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

    return vars
  }

  /**
   * Extract the subscripts from one or more variable names and check if they "agree".
   */
  extractSubscriptsFromVarNames(...varNames) {
    // XXX: This is largely copied from the legacy `equation-reader.js`, consider revisiting

    let result = new Set()
    const re = /\[[^\]]+\]/g
    for (let varName of varNames) {
      let subs = varName.match(re)
      if (subs) {
        for (let sub of subs) {
          result.add(sub.trim())
        }
      }
    }

    if (result.size > 1) {
      throw new Error(`Subscripts do not agree in extractSubscriptsFromVarNames: ${[...varNames]}`)
    }
    return [...result][0] || ''
  }
}

/**
 * TODO: Docs and types
 *
 * @param v {*} The `Variable` instance to process.
 */
export function readEquation(v) {
  const eqn = v.parsedEqn
  const context = new Context(eqn?.lhs, v.refId)

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
        // Nothing to do here currently
        break
      case 'data':
        // TODO: For reasons of compatibility with the legacy reader, the new `readVariables`
        // will set `varType='data'` only when the variable is not expanded.  Once we remove
        // the legacy reader, we can fix `readVariables` to unconditionally set `varType='data'`
        // for all variables with 'data' on the RHS.  In the meantime, set it here.
        v.varType = 'data'
        break
      default:
        throw new Error(`Unhandled equation kind '${rhs.kind}' for '${v.modelLHS}'`)
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
    case 'string':
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
      // TODO: Lookup defs in expression position should only occur in the case of `WITH LOOKUP`
      // function calls, and those are transformed into a generated lookup variable, so there's
      // nothing else we need to do here, but it would be good to add a check that the current
      // function is `WITH LOOKUP` (if it is, ignore, but if it is not, throw an error).
      break

    case 'lookup-call':
      visitLookupCall(v, expr, context)
      break

    case 'function-call':
      visitFunctionCall(v, expr, context)
      break

    default:
      throw new Error(`Unhandled expression kind '${expr.kind}' when reading '${v.modelLHS}'`)
  }
}

/**
 * Visit a RHS variable reference and add the referenced variable instance(s) to the
 * set of references.
 *
 * If the referenced variable does not have subscripts, or is an apply-to-all variable,
 * this will add a single reference:
 *
 * Example 1: RHS variable has no subscripts (`_y` has a single reference to `_x`)
 *   y = x ~~|
 *
 * Example 2: RHS variable is apply-to-all (`_y` has a single reference to `_x`)
 *   x[DimA] = 1 ~~|
 *   y[DimA] = x[DimA] ~~|
 *
 * If the referenced variable is a non-apply-to-all (separated) variable, this will
 * add one reference for each variable instance:
 *
 * Example 3: RHS variable is non-apply-to-all (`_y` has references to `_x[_a1]`, `_x[_a2]`, etc)
 *   x[DimA] = 1, 2 ~~|
 *   y[DimA] = x[DimA] ~~|
 *
 * @param {*} v The parsed variable.
 * @param {*} varRefExpr The variable reference that appears on the RHS of the `v` equation.
 * @param {*} context The read context.
 */
function visitVariableRef(v, varRefExpr, context) {
  // Mark the RHS as non-constant, since it has a variable reference
  context.rhsNonConst = true

  if (isDimension(varRefExpr.varId) || isIndex(varRefExpr.varId)) {
    // It is possible for a dimension or subscript/index name to be used where a variable
    // would normally be.  Here is an example taken from the "extdata" sample model:
    //   Chosen C = 1 ~~|
    //   C Selection[DimC] = IF THEN ELSE ( DimC = Chosen C , 1 , 0 ) ~~|
    // If we detect a dimension or subscript/index, don't add it as a normal variable reference.
    return
  }

  // Determine whether to add references to specific refIds (in the case of separated
  // non-apply-to-all variables) or just a single base refId (in the case of non-subscripted
  // or apply-to-all variables)
  const rhsBaseRefId = varRefExpr.varId
  const rhsSubIds = varRefExpr.subscriptRefs?.map(subRef => subRef.subId) || []

  // Record each instance of the referenced variable
  const expandedRefIds = expandedRefIdsForVar(v, rhsBaseRefId, rhsSubIds)
  for (const refId of expandedRefIds) {
    context.addVarReference(refId)
  }
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

  // Add a reference to the lookup variable
  const lookupVarName = callExpr.varRef.varId
  if (v.referencedLookupVarNames) {
    v.referencedLookupVarNames.push(lookupVarName)
  } else {
    v.referencedLookupVarNames = [lookupVarName]
  }

  // Visit the single argument
  visitExpr(v, callExpr.arg, context)
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

  // By default, we will add this function to the list of functions that are referenced
  // by the LHS variable, but we will skip this step for function calls like `DELAY` that
  // are reimplemented in terms of other equations
  let addFnReference = true

  // By default, all arguments are assumed to be used at eval time, but certain functions
  // will override this and mark specific argument positions as being used at init time
  let argModes = Array(callExpr.args.length).fill('eval')

  // By default, we will visit all arguments, but for certain functions like `DELAY` that
  // are reimplemented in terms of other equations, we will skip visiting the arguments
  // (they will be visited when processing the replacement equations)
  let visitArgs = true

  switch (callExpr.fnId) {
    //
    //
    // 1-argument functions...
    //
    //

    case '_ABS':
    case '_ARCCOS':
    case '_ARCSIN':
    case '_ARCTAN':
    case '_COS':
    case '_ELMCOUNT':
    case '_EXP':
    case '_GAMMA_LN':
    case '_INTEGER':
    case '_LN':
    case '_SIN':
    case '_SQRT':
    case '_SUM':
    case '_TAN':
    case '_VMAX':
    case '_VMIN':
      validateCallArgs(callExpr, 1)
      break

    //
    //
    // 2-argument functions...
    //
    //

    case '_LOOKUP_BACKWARD':
    case '_LOOKUP_FORWARD':
    case '_LOOKUP_INVERT':
    case '_MAX':
    case '_MIN':
    case '_MODULO':
    case '_POW':
    case '_POWER':
    case '_PULSE':
    case '_QUANTUM':
    case '_STEP':
    case '_VECTOR_ELM_MAP':
    case '_VECTOR_SORT_ORDER':
    case '_ZIDZ':
      validateCallArgs(callExpr, 2)
      break

    //
    //
    // 3-plus-argument functions...
    //
    //

    case '_GET_DATA_BETWEEN_TIMES':
    case '_RAMP':
    case '_XIDZ':
      validateCallArgs(callExpr, 3)
      break

    case '_PULSE_TRAIN':
      validateCallArgs(callExpr, 4)
      break

    case '_VECTOR_SELECT':
      validateCallArgs(callExpr, 5)
      break

    //
    //
    // Complex functions...
    //
    //

    case '_ACTIVE_INITIAL':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 2)
      v.hasInitValue = true
      // The 2nd argument is used at init time
      argModes[1] = 'init'
      break

    case '_ALLOCATE_AVAILABLE':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 3)
      break

    case '_DELAY1':
    case '_DELAY1I':
    case '_DELAY3':
    case '_DELAY3I':
      validateCallArgs(callExpr, callExpr.fnId.endsWith('I') ? 3 : 2)
      addFnReference = false
      visitArgs = false
      generateDelayVariables(v, callExpr, context)
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

    case '_GAME':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 1)
      generateGameVariables(v, callExpr, context)
      break

    case '_GET_DIRECT_CONSTANTS': {
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 3)
      validateCallArgType(callExpr, 0, 'string')
      validateCallArgType(callExpr, 1, 'string')
      validateCallArgType(callExpr, 2, 'string')
      addFnReference = false
      v.varType = 'const'
      v.directConstArgs = {
        file: callExpr.args[0].text,
        tab: callExpr.args[1].text,
        startCell: callExpr.args[2].text
      }
      break
    }

    case '_GET_DIRECT_DATA':
    case '_GET_DIRECT_LOOKUPS':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 4)
      validateCallArgType(callExpr, 0, 'string')
      validateCallArgType(callExpr, 1, 'string')
      validateCallArgType(callExpr, 2, 'string')
      validateCallArgType(callExpr, 3, 'string')
      addFnReference = false
      v.varType = 'data'
      v.directDataArgs = {
        file: callExpr.args[0].text,
        tab: callExpr.args[1].text,
        timeRowOrCol: callExpr.args[2].text,
        startCell: callExpr.args[3].text
      }
      break

    case '_IF_THEN_ELSE':
      validateCallArgs(callExpr, 3)
      addFnReference = false
      break

    case '_INITIAL':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 1)
      v.varType = 'initial'
      v.hasInitValue = true
      // The single argument is used at init time
      argModes[0] = 'init'
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
      addFnReference = false
      visitArgs = false
      generateNpvVariables(v, callExpr, context)
      break

    case '_SAMPLE_IF_TRUE':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 3)
      v.hasInitValue = true
      // The 3rd argument is used at init time
      argModes[2] = 'init'
      break

    case '_SMOOTH':
    case '_SMOOTHI':
    case '_SMOOTH3':
    case '_SMOOTH3I':
      validateCallArgs(callExpr, callExpr.fnId.endsWith('I') ? 3 : 2)
      addFnReference = false
      visitArgs = false
      generateSmoothVariables(v, callExpr, context)
      break

    case '_TREND':
      validateCallArgs(callExpr, 3)
      addFnReference = false
      visitArgs = false
      generateTrendVariables(v, callExpr, context)
      break

    case '_WITH_LOOKUP':
      validateCallDepth(callExpr, context)
      validateCallArgs(callExpr, 2)
      generateLookup(v, callExpr, context)
      break

    default: {
      // See if the function name is actually the name of a lookup variable.  For Vensim
      // models, the antlr4-vensim grammar has separate definitions for lookup calls and
      // function calls, but in practice they can only be differentiated in the case
      // where the lookup has subscripts; when there are no subscripts, they get treated
      // like normal function calls, and in that case we will end up here.  If we find
      // a variable with the given name, then we will assume it's a lookup call, otherwise
      // we treat it as a call of an unimplemented function.
      const varId = callExpr.fnId.toLowerCase()
      const referencedVar = Model.varWithName(varId)
      if (referencedVar === undefined || referencedVar.parsedEqn.rhs.kind !== 'lookup') {
        // Throw an error if the function is not yet implemented in SDE
        // TODO: This will report false positives in the case of user-defined macros.  For now
        // we provide the ability to turn off this check via an environment variable, but we
        // should consider providing a way for the user to declare the names of any user-defined
        // macros so that we can skip this check when those macros are detected.
        if (process.env.SDE_REPORT_UNSUPPORTED_FUNCTIONS !== '0') {
          const msg = `Unhandled function '${callExpr.fnId}' in readEquations for '${v.modelLHS}'`
          if (process.env.SDE_REPORT_UNSUPPORTED_FUNCTIONS === 'warn') {
            console.warn(`WARNING: ${msg}`)
          } else {
            throw new Error(msg)
          }
        }
      }
      break
    }
  }

  if (addFnReference) {
    // Keep track of all function names referenced in this equation.  Note that lookup
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

  if (visitArgs) {
    // Visit each argument
    for (const [index, argExpr] of callExpr.args.entries()) {
      if (callExpr.fnId === '_WITH_LOOKUP' && index > 1) {
        // XXX: For `WITH LOOKUP` calls, only process the first argument; need to generalize this
        break
      } else if (callExpr.fnId === '_ALLOCATE_AVAILABLE' && index === 1) {
        // XXX: Handle `ALLOCATE AVAILABLE` calls specially for now.  This logic is copied from the
        // legacy reader, but we may want to revisit later.
        // Reference the second and third elements of the priority profile argument instead of the
        // first one that Vensim requires for ALLOCATE AVAILABLE.  This is required to pick up
        // correct dependencies.
        if (argExpr.kind !== 'variable-ref') {
          throw new Error(`ALLOCATE AVAILABLE argument 'pp' must be a variable reference`)
        }
        const rhsVarBaseRefId = argExpr.varId
        const rhsVarSubIds = argExpr.subscriptRefs?.map(subRef => subRef.subId) || []
        const expandedRefIds = expandedRefIdsForVar(v, rhsVarBaseRefId, rhsVarSubIds)
        const ptypeRefId = expandedRefIds[0]
        const { subscripts } = Model.splitRefId(ptypeRefId)
        const ptypeIndexName = subscripts[1]
        const profileElementsDimName = sub(ptypeIndexName).family
        const profileElementsDim = sub(profileElementsDimName)
        const priorityRefId = ptypeRefId.replace(ptypeIndexName, profileElementsDim.value[1])
        const widthRefId = ptypeRefId.replace(ptypeIndexName, profileElementsDim.value[2])
        context.addVarReference(priorityRefId)
        context.addVarReference(widthRefId)
        continue
      }

      context.setArgIndex(index, argModes[index])
      visitExpr(v, argExpr, context)
    }
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
 * Throw an error if the function call argument at the given index does not have the expected type.
 */
function validateCallArgType(callExpr, index, expectedKind) {
  const argKind = callExpr.args[index].kind
  if (argKind !== expectedKind) {
    throw new Error(
      `Expected '${callExpr.fnName}' function call argument at index ${index} to be of type ${expectedKind} arguments but got ${argKind} `
    )
  }
}

/**
 * Return an array of `refId`s for the variables that are referenced on the RHS of the
 * equation for `lhsVariable`.
 */
function expandedRefIdsForVar(lhsVariable, rhsBaseRefId, rhsSubIds) {
  if (rhsSubIds.length === 0) {
    // The reference is to non-subscripted variable, so return a single reference to the
    // base variable ID
    return [rhsBaseRefId]
  }

  // Remove dimension subscripts marked with ! and save them for later.
  let markedDims = extractMarkedDims(rhsSubIds)

  //
  // See if this variable is non-apply-to-all.  This will return a boolean for each
  // subscript position of the referenced variable.
  //
  // Example 1: Suppose we have a 3D non-apply-to-all variable (that is separated
  // over the middle dimension):
  //   x[DimA, SubB, DimC] = 1 ~~|
  // In this case, `expansionFlags` will return [false, true, false].
  //
  // Example 2: Suppose we have a 3D apply-to-all variable:
  //   x[DimA, DimB, DimC] = 1 ~~|
  // In this case, `expansionFlags` will return `undefined` because the referenced
  // variable is apply-to-all.
  //
  let expansionFlags = Model.expansionFlags(rhsBaseRefId)
  if (!expansionFlags) {
    // The reference is to an apply-to-all variable, so return a single reference to the
    // base variable ID
    return [rhsBaseRefId]
  }

  // The reference is to a non-apply-to-all variable.
  // Find the refIds of the vars that include the indices in the reference.
  // Get the vars with the var name of the reference. We will choose from these vars.
  let varsWithRefName = Model.varsWithName(rhsBaseRefId)

  // The refIds of actual vars containing the indices will accumulate with possible duplicates.
  let expandedRefIds = []

  // Accumulate an array of lists of the separated index names at each position.
  let indexNames = []
  for (let iSub = 0; iSub < expansionFlags.length; iSub++) {
    if (expansionFlags[iSub]) {
      // For each index name at the subscript position, find refIds for vars that include the index.
      // This process ensures that we generate references to vars that are in the var table.
      let indexNamesAtPos
      // Use the single index name for a separated variable if it exists.
      // But don't do this if the subscript is a marked dimension in a vector function.
      let separatedIndexName = separatedVariableIndex(rhsSubIds[iSub], lhsVariable, rhsSubIds)
      if (!markedDims.includes(rhsSubIds[iSub]) && separatedIndexName) {
        indexNamesAtPos = [separatedIndexName]
      } else {
        // Generate references to all the indices for the subscript.
        indexNamesAtPos = indexNamesForSubscript(rhsSubIds[iSub])
      }
      indexNames.push(indexNamesAtPos)
    }
  }

  // Flatten the arrays of index names at each position into an array of index name combinations.
  let separatedIndices = cartesianProductOf(indexNames)
  // Find a separated variable for each combination of indices.
  for (let separatedIndex of separatedIndices) {
    // Consider each var with the same name as the reference in the equation.
    for (let refVar of varsWithRefName) {
      let iSeparatedIndex = 0
      let iSub
      for (iSub = 0; iSub < expansionFlags.length; iSub++) {
        if (expansionFlags[iSub]) {
          let refVarIndexNames = indexNamesForSubscript(refVar.subscripts[iSub])
          if (refVarIndexNames.length === 0) {
            console.error(
              `ERROR: no subscript at subscript position ${iSub} for var ${refVar.refId} with subscripts ${refVar.subscripts}`
            )
          }
          if (!refVarIndexNames.includes(separatedIndex[iSeparatedIndex++])) {
            break
          }
        }
      }
      if (iSub >= expansionFlags.length) {
        // All separated index names matched index names in the var, so add it as a reference.
        expandedRefIds.push(refVar.refId)
        break
      }
    }
  }

  // Sort the expandedRefIds and eliminate duplicates.
  return R.uniq(expandedRefIds.sort())
}
