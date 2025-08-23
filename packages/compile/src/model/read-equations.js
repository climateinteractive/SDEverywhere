import { parseVensimModel } from '@sdeverywhere/parse'

import { canonicalName, cartesianProductOf, newDepreciationVarName, newFixedDelayVarName } from '../_shared/helpers.js'

import { hasMapping, indexNamesForSubscript, isDimension, isIndex, sub } from '../_shared/subscript.js'

import Model from './model.js'
import { generateDelayVariables } from './read-equation-fn-delay.js'
import { generateGameVariables } from './read-equation-fn-game.js'
import { generateNpvVariables } from './read-equation-fn-npv.js'
import { generateSmoothVariables } from './read-equation-fn-smooth.js'
import { generateTrendVariables } from './read-equation-fn-trend.js'
import { generateLookup } from './read-equation-fn-with-lookup.js'
import { readVariables } from './read-variables.js'

class Context {
  constructor(modelKind, eqnLhs, refId) {
    // The kind of model being read, either 'vensim' or 'xmile'
    this.modelKind = modelKind

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
   * Define new variables for the given equations that are generated at compile time.  This will
   * add the variables for the given equations to the `Model` first, and after they are added,
   * it will perform the* same `readEquation` step on each that is applied to all other regular
   * variables.
   *
   * NOTE: In the case where multiple equations are generated at compile time for the purposes
   * of implementing a complex function (e.g., `DELAY3`), this should be called once only after
   * the equation text for those generated variables is known.  This ensures that all variables
   * are defined in the model before `readEquation` performs further processing, similar to the
   * process we use when reading the original model (we first call `readVariables` on all
   * model variable definitions before calling `readEquation` on each).
   *
   * @param {string[]} eqnStrings An array of individual equation strings in Vensim format.
   */
  defineVariables(eqnStrings) {
    // Parse the equation text, which is assumed to be in Vensim format
    const eqnText = eqnStrings.join('\n')
    const parsedModel = { kind: 'vensim', root: parseVensimModel(eqnText) }

    // Create one or more `Variable` instances from the equations
    // TODO: Technically we should pass `spec.separateAllVarsWithDims` here so that any
    // generated apply-to-all variables will be separated according to the spec like other
    // normal variables
    const vars = readVariables(parsedModel)

    // Add the variables to the `Model`
    vars.forEach(v => Model.addVariable(v))

    // Define the refId for each variable.  Note that the refIds for all added variables
    // need to be defined before we proceed to the next step that calls `readEquation`
    // for each variable.
    vars.forEach(v => {
      v.refId = Model.refIdForVar(v)
    })

    vars.forEach(v => {
      // Process each variable using the same process as above
      readEquation(v, 'vensim')

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
 * @param {string} modelKind The kind of model being read, either 'vensim' or 'xmile'.
 */
export function readEquation(v, modelKind) {
  const eqn = v.parsedEqn
  const context = new Context(modelKind, eqn?.lhs, v.refId)

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

  // If the `unhandled` flag is set, it means we did not match a known function
  let unhandled = false

  // Helper function that validates a function call for a Vensim model
  function validateVensimFunctionCall() {
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

      default:
        unhandled = true
        break
    }
  }

  // Helper function that validates a function call for a Stella model
  // XXX: Currently we conflate "XMILE model" with "XMILE model as generated by Stella",
  // so this function only handles the subset of Stella functions that are supported in
  // SDEverywhere's runtime library
  function validateStellaFunctionCall() {
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
      case '_EXP':
      case '_GAMMALN':
      case '_INT':
      case '_LN':
      case '_SIN':
      case '_SQRT':
      case '_SUM':
      case '_TAN':
        break

      //
      //
      // 2-argument functions...
      //
      //

      case '_LOOKUP':
      case '_LOOKUPINV':
      case '_MAX':
      case '_MIN':
      case '_MOD':
      case '_STEP':
        validateCallArgs(callExpr, 2)
        break

      //
      //
      // 3-plus-argument functions...
      //
      //

      case '_RAMP':
        validateCallArgs(callExpr, 3)
        break

      //
      //
      // Complex functions...
      //
      //

      case '_DELAY1':
      case '_DELAY3':
        // Stella's DELAY1 and DELAY3 functions can take a third "initial" argument (in which case
        // they behave like Vensim's DELAY1I and DELAY3I functions)
        validateCallArgs(callExpr, [2, 3])
        addFnReference = false
        visitArgs = false
        generateDelayVariables(v, callExpr, context)
        break

      case '_IF_THEN_ELSE':
        validateCallArgs(callExpr, 3)
        addFnReference = false
        break

      case '_INIT':
        validateCallDepth(callExpr, context)
        validateCallArgs(callExpr, 1)
        v.varType = 'initial'
        v.hasInitValue = true
        // The single argument is used at init time
        argModes[0] = 'init'
        break

      case '_INTEG':
        // NOTE: Stella doesn't have a built-in `INTEG` function, but our XMILE parser synthesizes
        // an `INTEG` function call for `<stock>` variable definitions using the `<inflow>` element
        // as the `rate` argument for the Vensim-style `INTEG` function call
        validateCallDepth(callExpr, context)
        validateCallArgs(callExpr, 2)
        v.varType = 'level'
        v.hasInitValue = true
        // The 2nd argument is used at init time
        argModes[1] = 'init'
        break

      case '_SMTH1':
      case '_SMTH3':
        // Stella's SMTH1 and SMTH3 functions can take a third "initial" argument (in which case
        // they behave like Vensim's SMOOTHI and SMOOTH3I functions)
        validateCallArgs(callExpr, [2, 3])
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

      default:
        unhandled = true
        break
    }
  }

  // Validate the function call based on the model kind
  if (context.modelKind === 'vensim') {
    validateVensimFunctionCall()
  } else if (context.modelKind === 'xmile') {
    validateStellaFunctionCall()
  } else {
    throw new Error(`Unknown model kind: ${context.modelKind}`)
  }

  if (unhandled) {
    // We did not match a known function, so we need to check if this is a lookup call.
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
        // Handle the second (`pp` or priority profile) argument of `ALLOCATE AVAILABLE` calls
        // specially.  An example call with a 2D `pp` looks like this:
        //   shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], avail) ~~|
        // Or a 3D `pp` with a dimension:
        //   shipments[item,branch] = ALLOCATE AVAILABLE(demand[branch], priority[item,branch,ptype], avail) ~~|
        // Or a 3D `pp` with a specific subscript:
        //   shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[item1,branch,ptype], avail) ~~|
        // Vensim requires passing a reference with `ptype` as the last subscript, but the function
        // implementation uses the `ppriority` and `pwidth` values (the `ptype` is currently assumed
        // to be 3).  Therefore we need to add references to all variants of the variable, not just
        // the ones for `ptype`.
        if (argExpr.kind !== 'variable-ref') {
          throw new Error(`ALLOCATE AVAILABLE argument 'pp' must be a variable reference`)
        }
        // TODO: Throw an error if the last dimension of arg0 does not match last dimension of LHS
        // TODO: Throw an error if the second-to-last dimension of arg1 does not match last dimension of LHS
        // TODO: Throw an error if the last subscript of arg1 does not have the "shape" of a `ppriority` dimension
        // TODO: Throw an error if the `ptype` value is not 3
        // Get the RHS subscript/dimension IDs
        const rhsVarBaseRefId = argExpr.varId
        const rhsVarSubIds = argExpr.subscriptRefs?.map(subRef => subRef.subId) || []
        // Extract the `ptype` subscript and get its parent dimension/family ID
        const ptypeSubId = rhsVarSubIds[rhsVarSubIds.length - 1]
        const profileDimId = sub(ptypeSubId).family
        const profileDim = sub(profileDimId)
        // Get all refIds for the referenced variable for each of the `profile` subscripts
        for (const profileSubId of profileDim.value) {
          // Replace the last `ptype` subscript with the ID of the parent dimension so that
          // `expandedRefIdsForVar` will return refIds for that last subscript
          rhsVarSubIds[rhsVarSubIds.length - 1] = profileSubId
          const expandedRefIds = expandedRefIdsForVar(v, rhsVarBaseRefId, rhsVarSubIds)
          // Record each instance of the referenced variable
          for (const refId of expandedRefIds) {
            context.addVarReference(refId)
          }
        }
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
  if (Array.isArray(expectedArgCount)) {
    if (!expectedArgCount.includes(callExpr.args.length)) {
      throw new Error(
        `Expected '${callExpr.fnName}' function call to have ${expectedArgCount.join('|')} arguments but got ${
          callExpr.args.length
        }`
      )
    }
  } else {
    if (callExpr.args.length !== expectedArgCount) {
      throw new Error(
        `Expected '${callExpr.fnName}' function call to have ${expectedArgCount} arguments but got ${callExpr.args.length}`
      )
    }
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
 * Return an array of `refId`s for a variable that is referenced on the RHS of the
 * equation for `lhsVariable`.
 *
 * If the referenced variable is non-subscripted or is apply-to-all, this will return
 * an array with a single `refId`.
 *
 * If the referenced variable is non-apply-to-all (i.e., it has more than one instance),
 * this will return an array of `refId`s that are relevant for the given `lhsVariable`.
 *
 * @param {*} lhsVariable The LHS variable instance that has an equation that references
 * the given `rhsBaseVarRefId` variable on the RHS.
 * @param {string} rhsBaseRefId The base variable ID of the variable referenced on the RHS.
 * @param {string[]} rhsSubIds The array of parsed subscript/dimension IDs that are included
 * in the RHS variable reference.
 */
function expandedRefIdsForVar(lhsVariable, rhsBaseRefId, rhsSubIds) {
  if (rhsSubIds.length === 0) {
    // The RHS reference is to non-subscripted variable, so return a single `refId`
    return [rhsBaseRefId]
  }

  // Get all variable instances for the referenced RHS variable
  const rhsVarInstances = Model.varsWithName(rhsBaseRefId)
  if (rhsVarInstances.length === 0) {
    // The referenced variable is unknown; throw an error
    throw new Error(`No variable found for ${rhsBaseRefId}, which was referenced by ${lhsVariable.refId}`)
  }

  //
  // At this point we know that there are multiple instances of the referenced variable, so
  // it must be non-apply-to-all.  The goal now is to determine which instances (refIds) are
  // relevant for the given `lhsVariable` context.
  //
  // First, get all combinations of the LHS subscripts that map to the subscripts/dimensions
  // in the RHS variable reference.  For example:
  //   y[DimA,DimB,DimC] :EXCEPT: [DimA,DimB,C1] = x[DimA,DimC,DimB]
  // In this case the `DimC` on the RHS is only "accessed" by `C2` from the LHS, so we would
  // build an array of strings representing the possible subset of combinations, like this:
  //   _a1,_c2,_b1
  //   _a1,_c2,_b2
  //   _a2,_c2,_b1
  //   _a2,_c2,_b2
  //
  // Then, for each RHS variable instance:
  //   - get all combinations of RHS subscripts that can be accepted by that RHS instance
  //     (build an array of strings, e.g., ['_a1,_c1,_b1', '_a1,_c1,_b1', ...])
  //   - see if any of the LHS subscript combos match any of the RHS subscript combos; if
  //     so, then add the RHS `refId` to the array of variables referenced by the LHS
  //
  // In the following examples, suppose the referenced RHS variable is non-apply-to-all and
  // has two instances:
  //   _x[_dima,_c1,_dimb]
  //   _x[_dima,_c2,_dimb]
  //
  // Example 1: Suppose we have the following equation, where the LHS variable is apply-to-all:
  //   y[DimA,DimB,DimC] = x[DimA,DimC,DimB]
  // In this case, the LHS variable will reference all instances of `x`, so this function will
  // return two refIds:
  //   _x[_dima,_c1,_dimb]
  //   _x[_dima,_c2,_dimb]
  //
  // Example 2: Suppose we have the following equation, where the LHS variable is apply-to-all,
  // but the RHS reference is for a specific instance:
  //   y[DimA,DimB,DimC] = x[DimA,C1,DimB]
  // In this case, the LHS variable will reference only one instance of `x`, so this function
  // will return one refId:
  //   _x[_dima,_c1,_dimb]
  //
  // Example 3: Suppose we have the following equation, where the LHS variable is NON-apply-to-all:
  //   y[DimA,DimB,DimC] :EXCEPT: [DimA,DimB,C1] = x[DimA,DimC,DimB]
  // The LHS variable will already have been separated into multiple instances (due to the "except"
  // clause), and the specific instance of the LHS variable in this case will be:
  //   _y[_dima,_dimb,_c2]
  // In this case, this instance of the LHS variable will reference only one instance of `x`,
  // so this function will return one refId:
  //   _x[_dima,_c2,_dimb]
  //

  // Step 1: Get all combinations of the LHS subscripts that map to the subscripts/dimensions
  // in the RHS variable reference.  Here `rhsSubIds` is the array of parsed subscript/dimension
  // IDs that appear in the RHS variable reference.  We figure out which LHS subscripts/dimensions
  // are relevant for the RHS subscripts/dimensions given the context of the LHS variable (which
  // may have been separated/expanded).
  const lhsSubRefs = lhsVariable.parsedEqn.lhs.varDef.subscriptRefs
  const lhsSubIds = lhsSubRefs?.map(subRef => subRef.subId) || []
  const mappedLhsSubIds = rhsSubIds.map(rhsSubId => resolveRhsSubOrDim(lhsVariable, lhsSubIds, rhsSubId))

  // Step 2: Build an array of mapped LHS subscript combos (one string of comma-separated
  // subscript IDs for each combo)
  const mappedLhsSubIdsPerPosition = mappedLhsSubIds.map(indexNamesForSubscript)
  const mappedLhsCombos = cartesianProductOf(mappedLhsSubIdsPerPosition).map(combo => combo.join(','))

  // Step 3: For each RHS variable instance, get all combinations of RHS subscripts that can
  // be accepted by that particular RHS instance
  const rhsRefIds = []
  for (const rhsVarInstance of rhsVarInstances) {
    // Build RHS subscript combos (one string of comma-separated subscript IDs for each combo)
    const rhsVarInstanceSubIdsPerPosition = rhsVarInstance.subscripts.map(indexNamesForSubscript)
    const rhsCombos = cartesianProductOf(rhsVarInstanceSubIdsPerPosition).map(combo => combo.join(','))

    // See if any of the LHS subscript combos match any of the RHS subscript combos
    for (const lhsCombo of mappedLhsCombos) {
      if (rhsCombos.includes(lhsCombo)) {
        // There was a match; add the refId and break out of the inner loop
        rhsRefIds.push(rhsVarInstance.refId)
        break
      }
    }
  }

  // Return the sorted array of relevant refIds
  // TODO: Sorting is not essential here, but the legacy reader sorted so we will keep that
  // behavior now to avoid invalidating tests.  Later we should remove this `sort` call and
  // update the tests accordingly.
  return rhsRefIds.sort()
}

/**
 * Return the LHS dimension or subscript that is associated with the given RHS subscript
 * or dimension ID appearing on the RHS of an equation.
 *
 * @param {*} lhsVariable The LHS variable instance that has an equation that references
 * a variable on the RHS.
 * @param {string[]} lhsSubIds The array of original (parsed) subscript or dimension IDs
 * for the LHS variable definition.
 * @param {string} rhsSubId The dimension or subscript ID appearing in a variable reference
 * on the RHS of an equation.
 * @return A single dimension or subscript ID.
 */
function resolveRhsSubOrDim(lhsVariable, lhsSubIds, rhsSubId) {
  if (rhsSubId.includes('!')) {
    // The dimension ID at this position is "marked", indicating that the vector function
    // (e.g., `SUM`) should operate over the elements in this dimension.  This implies
    // that the LHS depends on all instances of the RHS variable; we will use that RHS
    // dimension so that all subscripts within that dimension are expanded in Step 2.
    return rhsSubId.replace('!', '')
  }

  if (isIndex(rhsSubId)) {
    // The ID at this position is for a subscript/index, so we will use that directly
    return rhsSubId
  }

  // The ID at this position is for a dimension; figure out which LHS subscript/dimension
  // is a match.  First see if there is an exact match.
  const lhsDimIndex = lhsSubIds.findIndex(lhsSubId => lhsSubId === rhsSubId)
  if (lhsDimIndex >= 0) {
    // There is a match.  If the LHS variable is separated, use the separated subscript
    // ID at this position (i.e., the value from the `subscripts` array), otherwise we
    // use the dimension ID at this position.
    return lhsVariable.subscripts[lhsDimIndex]
  }

  // There isn't an exact match; in this case, find the position of the LHS dimension that
  // has a mapping to the RHS dimension
  const mappedLhsDimIndex = lhsSubIds.findIndex(lhsSubId => hasMapping(rhsSubId, lhsSubId))
  if (mappedLhsDimIndex >= 0) {
    // There is a match.  If the LHS variable is separated, use the _mapped_ separated
    // subscript ID at this position (i.e., the value from the `subscripts` array),
    // otherwise we use the _mapped_ dimension ID at this position.
    const mappedLhsSubOrDimId = lhsVariable.subscripts[mappedLhsDimIndex]
    if (isIndex(mappedLhsSubOrDimId)) {
      // Determine the mapped subscript.  For example, suppose we have:
      //   Dim: (t1-t3) ~~|
      //   SubA: (t2-t3) -> SubB ~~|
      //   SubB: (t1-t2) -> SubA ~~|
      //   y[SubA] = x[SubB] ~~|
      // Note that `y` will be separated.  Suppose we are evaluating the first instance
      // of `y`, i.e., `_y[_t2]`.  We get the object/metadata for each dimension, which
      // will look like the following (unrelated properties are omitted):
      //   lhsDim == {
      //     name: '_suba',
      //     value: [ '_t2', '_t3' ],
      //     family: '_dim',
      //     mappings: { _subb: [ '_t2', '_t3' ] }
      //   }
      //   rhsDim == {
      //     name: '_subb',
      //     value: [ '_t1', '_t2' ],
      //     family: '_dim',
      //     mappings: { _suba: [ '_t1', '_t2' ] }
      //   }
      // The separated LHS subscript in this case is `_t2`, so we need to figure out
      // the corresponding subscript in the mapped RHS dimension, which is `_t1`.
      const mappedLhsSubId = mappedLhsSubOrDimId
      const mappedLhsDimId = lhsSubIds[mappedLhsDimIndex]
      const lhsDim = sub(mappedLhsDimId)
      const rhsDim = sub(rhsSubId)
      const lhsSubIndex = lhsDim.value.indexOf(mappedLhsSubId)
      if (lhsSubIndex >= 0) {
        return rhsDim.mappings[mappedLhsDimId][lhsSubIndex]
      } else {
        throw new Error(
          `Failed to find mapped LHS subscript ${mappedLhsSubId} for RHS dimension ${rhsSubId} in lhs=${lhsVariable.refId}`
        )
      }
    } else {
      // TODO: Need to explain this case better
      return rhsSubId
    }
  } else {
    throw new Error(`Failed to find LHS dimension for RHS dimension ${rhsSubId} in lhs=${lhsVariable.refId}`)
  }
}

/**
 * Resolve any XMILE dimension wildcards in the given equation and return a new equation
 * that has the `_SDE_WILDCARD_` placeholder replaced with the actual dimension name.
 *
 * @param {*} variable The `Variable` instance to process.
 * @returns {*} The parsed equation with the `_SDE_WILDCARD_` placeholder replaced with the
 * actual dimension name, or `undefined` if the equation does not contain any wildcards.
 */
export function resolveXmileDimensionWildcards(variable) {
  const eqn = variable.parsedEqn
  if (!eqn.rhs || eqn.rhs.kind !== 'expr') {
    return undefined
  }

  // Create a deep copy of the equation and resolve wildcards
  let hasWildcards = false
  function resolveWildcardsInExpr(expr) {
    switch (expr.kind) {
      case 'variable-ref': {
        if (!expr.subscriptRefs) {
          return expr
        }

        // Check if this variable reference has wildcards
        let varRefHasWildcard = false
        const newSubscriptRefs = expr.subscriptRefs.map((subRef, subIndex) => {
          if (subRef.subId.startsWith('__sde_wildcard_')) {
            varRefHasWildcard = true
            hasWildcards = true

            // Look up the referenced variable to get its dimensions
            const referencedVars = Model.varsWithName(expr.varId)
            if (referencedVars && referencedVars.length > 0) {
              // Get the dimension ID at this index from the referenced variable
              const referencedDimOrSubId = referencedVars[0].subscripts[subIndex]

              // Get the dimension name for the ID
              const referencedDimOrSub = sub(referencedDimOrSubId)
              let referencedDimName
              let referencedDimId
              if (isIndex(referencedDimOrSubId)) {
                // This is a subscript, so get the parent dimension name and ID
                const parentDim = sub(referencedDimOrSub.family)
                referencedDimName = parentDim.modelName
                referencedDimId = parentDim.name
              } else {
                // This is a dimension, so take its name and ID directly
                referencedDimName = referencedDimOrSub.modelName
                referencedDimId = referencedDimOrSub.name
              }

              // Preserve any trailing characters (like '!') from the wildcard
              const trailingChars = subRef.subId.substring('__sde_wildcard_'.length)
              return {
                subName: referencedDimName + trailingChars,
                subId: referencedDimId + trailingChars
              }
            } else {
              // If we can't find the referenced variable or it has no dimensions, keep the wildcard
              return subRef
            }
          }
          return subRef
        })

        if (varRefHasWildcard) {
          return { ...expr, subscriptRefs: newSubscriptRefs }
        }
        return expr
      }

      case 'binary-op':
        return {
          ...expr,
          lhs: resolveWildcardsInExpr(expr.lhs),
          rhs: resolveWildcardsInExpr(expr.rhs)
        }

      case 'parens':
      case 'unary-op':
        return { ...expr, expr: resolveWildcardsInExpr(expr.expr) }

      case 'function-call': {
        const newArgs = expr.args.map(arg => resolveWildcardsInExpr(arg))
        return { ...expr, args: newArgs }
      }

      case 'lookup-call':
        return { ...expr, arg: resolveWildcardsInExpr(expr.arg) }

      case 'number':
      case 'string':
      case 'keyword':
      case 'lookup-def':
        return expr

      default:
        throw new Error(`Unhandled expression kind '${expr.kind}' when reading '${variable.modelLHS}'`)
    }
  }

  const resolvedRhs = resolveWildcardsInExpr(eqn.rhs.expr)
  if (!hasWildcards) {
    // No wildcards were found, so return the original equation
    return undefined
  }

  // Wildcards were found, so return a new equation with the wildcards replaced with the
  // actual dimension names
  return {
    ...eqn,
    rhs: {
      ...eqn.rhs,
      expr: resolvedRhs
    }
  }
}
