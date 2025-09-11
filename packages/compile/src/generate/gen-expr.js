import { cdbl, newTmpVarName } from '../_shared/helpers.js'
import { extractMarkedDims, isDimension, isIndex, sub } from '../_shared/subscript.js'

import Model from '../model/model.js'

/**
 * @typedef {Object} GenExprContext The context for a `generateExpr` call.
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-constants' | 'init-lookups' | 'init-levels' | 'eval'} mode The code generation mode.
 * @param {'c' | 'js'} outFormat The output format.
 * @param {string} cLhs The C/JS code for the LHS variable reference.
 * @param {LoopIndexVars} loopIndexVars The loop index state used for LHS dimensions.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions (that use marked dimensions).
 * @param {(s: string) => void} emitPreInnerLoop Function that will cause the given code to be appended to the chunk that
 * precedes the generated inner loop for the equation.
 * @param {(s: string) => void} emitPreFormula Function that will cause the given code to be appended to the chunk that
 * precedes the generated formula (the primary, inner-most part of the equation).
 * @param {(s: string) => void} emitPostFormula Function that will cause the given code to be appended to the chunk that
 * follows the generated formula (the primary, inner-most part of the equation).
 * @param {(varRef: VariableRef) => string} cVarRef Function that returns a C variable reference for a variable
 * referenced in a RHS expression.
 * @param {(baseVarId: string) => string} cVarRefWithLhsSubscripts Function that returns a C variable reference that
 * takes into account the relevant LHS subscripts.
 * @param {(subOrDimId: string) => string} cVarIndex Function that returns C/JS code for indexing into a subscripted variable.
 */

/**
 * Generate the RHS code for the given expression.
 *
 * TODO: Types
 *
 * @param {*} expr The expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
export function generateExpr(expr, ctx) {
  switch (expr.kind) {
    case 'number':
      return cdbl(expr.value)

    case 'string':
      return `'${expr.text}'`

    case 'keyword':
      if (expr.text === ':NA:') {
        return '_NA_'
      } else {
        throw new Error(`Unhandled keyword '${expr.text}' in code gen for '${ctx.variable.modelLHS}'`)
      }

    case 'variable-ref': {
      // This is a variable or dimension reference.  See if there is a variable defined for the ID.
      const v = Model.varWithName(expr.varId)
      if (v) {
        // This is a reference to a known variable
        if (v.isData()) {
          // It's a data variable; transform to a `_LOOKUP` function call
          return `${fnRef('_LOOKUP', ctx)}(${ctx.cVarRef(expr)}, _time)`
        } else {
          // It's not a data variable; generate a normal variable reference
          return ctx.cVarRef(expr)
        }
      } else if (isDimension(expr.varId)) {
        // This is a reference to a dimension that is being used in expression position.
        // In place of the dimension, emit the current value of the loop index variable
        // plus one (since Vensim indices are one-based).
        const dimId = expr.varId
        const indexCode = ctx.cVarIndex(dimId)
        return `(${indexExpr(indexCode, ctx)} + 1)`
      } else if (isIndex(expr.varId)) {
        // This is a reference to a subscript/index that is being used in expression position.
        // In place of the subscript, emit the numeric index value of the subscript plus one
        // (since Vensim indices are one-based).
        const subId = expr.varId
        const indexValue = sub(subId).value
        return `${indexValue + 1}`
      } else {
        throw new Error(`Unresolved variable reference '${expr.varName}' in code gen for '${ctx.variable.modelLHS}'`)
      }
    }

    case 'unary-op': {
      let op
      switch (expr.op) {
        case ':NOT:':
          op = '!'
          break
        case '+':
          // We can drop the explicit '+' prefix in this case
          op = ''
          break
        default:
          op = expr.op
          break
      }
      return `${op}${generateExpr(expr.expr, ctx)}`
    }

    case 'binary-op': {
      const lhs = generateExpr(expr.lhs, ctx)
      const rhs = generateExpr(expr.rhs, ctx)
      if (expr.op === '^') {
        return `${ctx.outFormat === 'js' ? 'fns.POW' : 'pow'}(${lhs}, ${rhs})`
      } else {
        let op
        switch (expr.op) {
          case '=':
            op = ctx.outFormat === 'js' ? '===' : '=='
            break
          case '<>':
            op = ctx.outFormat === 'js' ? '!==' : '!='
            break
          case ':AND:':
            op = '&&'
            break
          case ':OR:':
            op = '||'
            break
          default:
            op = expr.op
            break
        }
        return `${lhs} ${op} ${rhs}`
      }
    }

    case 'parens':
      return `(${generateExpr(expr.expr, ctx)})`

    case 'lookup-def':
      // Lookup defs in expression position should only occur in the case of `WITH LOOKUP`
      // function calls, and those are transformed into a generated lookup variable during
      // `readEquations`, so replace the def with a reference to the generated variable
      return ctx.variable.lookupArgVarName

    case 'lookup-call':
      // For Vensim models, the antlr4-vensim grammar has separate definitions for lookup
      // calls and function calls, but in practice they can only be differentiated in the
      // case where the lookup has subscripts; when there are no subscripts, they get
      // treated like normal function calls.  Therefore we need to handle these in two
      // places.  The code here deals with lookup calls that involve a lookup with one
      // or more dimensions.  The `default` case in `generateFunctionCall` deals with
      // lookup calls that involve a non-subscripted lookup variable.
      return generateLookupCall(expr.varRef, expr.arg, ctx)

    case 'function-call':
      return generateFunctionCall(expr, ctx)

    default:
      throw new Error(`Unhandled expression kind '${expr.kind}' when reading '${ctx.variable.modelLHS}'`)
  }
}

/**
 * Generate C/JS code for the given function call.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateFunctionCall(callExpr, ctx) {
  const fnId = callExpr.fnId

  switch (fnId) {
    //
    //
    // Simple functions
    //
    // Each of these functions is implemented with a C/JS function or C macro, so no further processing
    // is required other than to emit the function/macro call.
    //
    //

    case '_ABS':
    case '_ARCCOS':
    case '_ARCSIN':
    case '_ARCTAN':
    case '_COS':
    case '_EXP':
    case '_GAMMA_LN':
    case '_IF_THEN_ELSE':
    case '_INTEGER':
    case '_LN':
    case '_MAX':
    case '_MIN':
    case '_MODULO':
    case '_POW':
    case '_POWER':
    case '_PULSE':
    case '_PULSE_TRAIN':
    case '_QUANTUM':
    case '_RAMP':
    case '_SIN':
    case '_SQRT':
    case '_STEP':
    case '_TAN':
    case '_WITH_LOOKUP':
    case '_XIDZ':
    case '_ZIDZ': {
      const args = callExpr.args.map(argExpr => generateExpr(argExpr, ctx))
      if (ctx.outFormat === 'js' && fnId === '_GAMMA_LN') {
        throw new Error(`${callExpr.fnName} function not yet implemented for JS code gen`)
      }
      if (ctx.outFormat === 'js' && fnId === '_IF_THEN_ELSE') {
        // When generating conditional expressions for JS target, since we can't rely on macros like we do for C,
        // it is better to translate it into a ternary instead of relying on a built-in function (since the latter
        // would require always evaluating both branches, while the former can be more optimized by the interpreter)
        return `((${args[0]}) ? (${args[1]}) : (${args[2]}))`
      } else {
        // For simple functions, emit a C/JS function call with a generated C/JS expression for each argument
        return `${fnRef(fnId, ctx)}(${args.join(', ')})`
      }
    }

    //
    //
    // Lookup functions
    //
    // Each of these functions is implemented with a C/JS function (like the simple functions above),
    // but we need to handle the first argument specially, otherwise we would get the default handling
    // for data variables, which generates a lookup call (see 'variable-ref' case in `generateExpr`).
    //
    //

    case '_GET_DATA_BETWEEN_TIMES':
    case '_LOOKUP_BACKWARD':
    case '_LOOKUP_FORWARD':
    case '_LOOKUP_INVERT': {
      // For LOOKUP* functions, the first argument must be a reference to the lookup variable.  Emit
      // a C/JS function call with a generated C/JS expression for each remaining argument.
      const cVarRef = ctx.cVarRef(callExpr.args[0])
      const cArgs = callExpr.args.slice(1).map(arg => generateExpr(arg, ctx))
      return `${fnRef(fnId, ctx)}(${cVarRef}, ${cArgs.join(', ')})`
    }

    case '_GAME': {
      // For the GAME function, emit a C/JS function call that has the synthesized game inputs lookup
      // as the first argument, followed by the default value argument from the function call
      const cLookupArg = ctx.cVarRefWithLhsSubscripts(ctx.variable.gameLookupVarName)
      const cDefaultArg = generateExpr(callExpr.args[0], ctx)
      return `${fnRef(fnId, ctx)}(${cLookupArg}, ${cDefaultArg})`
    }

    //
    //
    // Level functions
    //
    //

    case '_ACTIVE_INITIAL':
    case '_DELAY_FIXED':
    case '_DEPRECIATE_STRAIGHTLINE':
    case '_SAMPLE_IF_TRUE':
    case '_INTEG':
      // Split level functions into init and eval expressions
      if (ctx.outFormat === 'js' && (fnId === '_DELAY_FIXED' || fnId === '_DEPRECIATE_STRAIGHTLINE')) {
        throw new Error(`${callExpr.fnName} function not yet implemented for JS code gen`)
      }
      if (ctx.mode.startsWith('init')) {
        return generateLevelInit(callExpr, ctx)
      } else if (ctx.mode === 'eval') {
        return generateLevelEval(callExpr, ctx)
      } else {
        throw new Error(`Invalid code gen mode '${ctx.mode}' for level variable '${ctx.variable.modelLHS}'`)
      }

    //
    //
    // Array functions
    //
    //

    case '_VECTOR_SELECT':
    case '_VMAX':
    case '_VMIN':
    case '_SUM':
      return generateArrayFunctionCall(callExpr, ctx)

    //
    //
    // Expanded functions
    //
    // Each of these function calls was expanded into multiple implementation variables
    // during the `generateEquations` phase, so in place of the entire function call, we
    // emit a reference to the expanded variable.
    //
    //

    case '_DELAY1':
    case '_DELAY1I':
    case '_DELAY3':
    case '_DELAY3I': {
      const delayVar = Model.varWithRefId(ctx.variable.delayVarRefId)
      const delayVarRef = ctx.cVarRef(delayVar.parsedEqn.lhs.varDef)
      // TODO: For now, extract the RHS subscripts from the ones that were computed for the
      // delay variable.  We should add a variant of cVarRef that returns only the RHS subs.
      // return `(${delayVar.varName}${rhsSubs} / ${ctx.variable.delayTimeVarName}${rhsSubs})`
      const delayVarParts = delayVarRef.split('[')
      const rhsSubs = delayVarParts.length > 1 ? `[${delayVarParts[1]}` : ''
      return `(${delayVarRef} / ${ctx.variable.delayTimeVarName}${rhsSubs})`
    }

    case '_NPV': {
      const npvVar = Model.varWithRefId(ctx.variable.npvVarName)
      return ctx.cVarRef(npvVar.parsedEqn.lhs.varDef)
    }

    case '_SMOOTH':
    case '_SMOOTHI':
    case '_SMOOTH3':
    case '_SMOOTH3I': {
      const smoothVar = Model.varWithRefId(ctx.variable.smoothVarRefId)
      return ctx.cVarRef(smoothVar.parsedEqn.lhs.varDef)
    }

    case '_TREND': {
      const trendVar = Model.varWithRefId(ctx.variable.trendVarName)
      return ctx.cVarRef(trendVar.parsedEqn.lhs.varDef)
    }

    //
    //
    // Vector functions
    //
    //

    case '_VECTOR_ELM_MAP':
      return generateVectorElmMapCall(callExpr, ctx)

    case '_VECTOR_SORT_ORDER':
      return generateVectorSortOrderCall(callExpr, ctx)

    //
    //
    // Uncategorized functions
    //
    //

    case '_ALLOCATE_AVAILABLE':
    case '_DEMAND_AT_PRICE':
    case '_SUPPLY_AT_PRICE':
      if (ctx.outFormat === 'js') {
        throw new Error(`${callExpr.fnName} function not yet implemented for JS code gen`)
      }
      return generateAllocationFunctionCall(callExpr, ctx)

    case '_FIND_MARKET_PRICE':
      if (ctx.outFormat === 'js') {
        throw new Error(`FIND MARKET PRICE function not yet implemented for JS code gen`)
      }
      return generateFindMarketPriceFunctionCall(callExpr, ctx)

    case '_ELMCOUNT': {
      // Emit the size of the dimension in place of the dimension name
      const dimArg = callExpr.args[0]
      if (dimArg.kind !== 'variable-ref') {
        throw new Error('Argument for ELMCOUNT must be a dimension name')
      }
      const dimId = dimArg.varId
      return `${sub(dimId).size}`
    }

    case '_GET_DIRECT_CONSTANTS':
    case '_GET_DIRECT_DATA':
    case '_GET_DIRECT_LOOKUPS':
      // These functions are handled at a higher level, so we should not get here
      throw new Error(`Unexpected function '${fnId}' in code gen for '${ctx.variable.modelLHS}'`)

    case '_INITIAL':
      // In init mode, only emit the initial expression without the INITIAL function call
      if (ctx.mode.startsWith('init')) {
        return generateExpr(callExpr.args[0], ctx)
      } else {
        throw new Error(`Invalid code gen mode '${ctx.mode}' for variable '${ctx.variable.modelLHS}' with INITIAL`)
      }

    default: {
      // See if the function name is actually the name of a lookup variable.  (See comment
      // 'lookup-call' case above about why this is needed.)  Note that if we reach this
      // point and the function call is actually a lookup call, then we can assume that the
      // lookup variable reference does not include subscripts, and we can use the base
      // variable ID only.
      const varId = fnId.toLowerCase()
      const v = Model.varWithName(varId)
      if (v?.isLookup()) {
        // Transform to a `_LOOKUP` function call
        const lookupVarRef = {
          kind: 'variable-ref',
          varName: callExpr.fnName,
          varId
        }
        return generateLookupCall(lookupVarRef, callExpr.args[0], ctx)
      } else {
        // Throw an error if the function is not yet implemented in SDE
        // TODO: This will report false positives in the case of user-defined macros.  For now
        // we provide the ability to turn off this check via an environment variable, but we
        // should consider providing a way for the user to declare the names of any user-defined
        // macros so that we can skip this check when those macros are detected.
        if (process.env.SDE_REPORT_UNSUPPORTED_FUNCTIONS !== '0') {
          const msg = `Unhandled function '${fnId}' in code gen for '${ctx.variable.modelLHS}'`
          if (process.env.SDE_REPORT_UNSUPPORTED_FUNCTIONS === 'warn') {
            console.warn(`WARNING: ${msg}`)
          } else {
            throw new Error(msg)
          }
        }
      }
    }
  }
}

/**
 * Generate C/JS code for the given level variable at init time.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateLevelInit(callExpr, ctx) {
  const fnId = callExpr.fnId

  // Get the index of the argument holding the initial value expression
  let initialArgIndex = 0
  switch (fnId) {
    case '_ACTIVE_INITIAL':
    case '_INTEG':
      initialArgIndex = 1
      break
    case '_DELAY_FIXED': {
      // Emit the code that initializes the `FixedDelay` support struct
      const fixedDelay = ctx.cVarRefWithLhsSubscripts(ctx.variable.fixedDelayVarName)
      const delayArg = generateExpr(callExpr.args[1], ctx)
      const initArg = generateExpr(callExpr.args[2], ctx)
      ctx.emitPostFormula(`${fixedDelay} = __new_fixed_delay(${fixedDelay}, ${delayArg}, ${initArg});`)
      initialArgIndex = 2
      break
    }
    case '_SAMPLE_IF_TRUE':
      initialArgIndex = 2
      break
    case '_DEPRECIATE_STRAIGHTLINE': {
      // Emit the code that initializes the `FixedDelay` support struct
      const dep = ctx.cVarRefWithLhsSubscripts(ctx.variable.depreciationVarName)
      const dtimeArg = generateExpr(callExpr.args[1], ctx)
      const initArg = generateExpr(callExpr.args[3], ctx)
      ctx.emitPostFormula(`${dep} = __new_depreciation(${dep}, ${dtimeArg}, ${initArg});`)
      initialArgIndex = 3
      break
    }
    default:
      throw new Error(`Unhandled function '${fnId}' in code gen for level variable '${ctx.variable.modelLHS}'`)
  }

  // Emit the initial value expression
  const initialArg = callExpr.args[initialArgIndex]
  return generateExpr(initialArg, ctx)
}

/**
 * Generate C/JS code for the given level variable at eval time.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateLevelEval(callExpr, ctx) {
  const fnId = callExpr.fnId

  function generateCall(args) {
    return `${fnRef(fnId, ctx)}(${args.join(', ')})`
  }

  switch (fnId) {
    case '_ACTIVE_INITIAL':
      // For ACTIVE INITIAL, emit the first arg without a function call
      return generateExpr(callExpr.args[0], ctx)

    case '_DELAY_FIXED': {
      // For DELAY FIXED, emit the first arg followed by the FixedDelay support var
      const args = []
      args.push(generateExpr(callExpr.args[0], ctx))
      args.push(ctx.cVarRefWithLhsSubscripts(ctx.variable.fixedDelayVarName))
      return generateCall(args)
    }

    case '_DEPRECIATE_STRAIGHTLINE': {
      // For DEPRECIATE STRAIGHTLINE, emit the first arg followed by the Depreciation support var
      const args = []
      args.push(generateExpr(callExpr.args[0], ctx))
      args.push(ctx.cVarRefWithLhsSubscripts(ctx.variable.depreciationVarName))
      return generateCall(args)
    }

    case '_INTEG':
    case '_SAMPLE_IF_TRUE': {
      // At eval time, emit the variable LHS as the first arg, giving the current value for the level.
      // Then emit the remaining arguments.
      const args = []
      args.push(ctx.cLhs)
      args.push(generateExpr(callExpr.args[0], ctx))
      if (fnId === '_SAMPLE_IF_TRUE') {
        args.push(generateExpr(callExpr.args[1], ctx))
      }
      if (ctx.outFormat === 'js' && fnId === '_SAMPLE_IF_TRUE') {
        // When generating conditional expressions for JS target, since we can't rely on macros like we do for C,
        // it is better to translate it into a ternary instead of relying on a built-in function (since the latter
        // would require always evaluating both branches, while the former can be more optimized by the interpreter)
        return `((${args[1]}) ? (${args[2]}) : (${args[0]}))`
      } else {
        // In all other cases, generate a normal call
        return generateCall(args)
      }
    }

    default:
      throw new Error(`Unhandled function '${fnId}' in code gen for level variable '${ctx.variable.modelLHS}'`)
  }
}

/**
 * Generate C/JS code for a lookup call.
 *
 * TODO: Types
 *
 * @param {*} lookupVarRef The lookup `VariableRef`.
 * @param {*} argExpr The parsed `Expr` for the single argument for the lookup.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateLookupCall(lookupVarRef, argExpr, ctx) {
  const cVarRef = ctx.cVarRef(lookupVarRef)
  const cArg = generateExpr(argExpr, ctx)
  return `${fnRef('_LOOKUP', ctx)}(${cVarRef}, ${cArg})`
}

/**
 * Generate C/JS code for an array function call (e.g., `SUM`).
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateArrayFunctionCall(callExpr, ctx) {
  // Determine the initial value and loop body depending on the function
  let tmpVar
  let initValue
  let loopBodyOp
  let returnCode
  let vsCondVar
  switch (callExpr.fnId) {
    case '_SUM':
      initValue = '0.0'
      loopBodyOp = 'sum'
      break

    case '_VMIN':
      initValue = maxNumber(ctx)
      loopBodyOp = 'min'
      break

    case '_VMAX':
      initValue = `-${maxNumber(ctx)}`
      loopBodyOp = 'max'
      break

    case '_VECTOR_SELECT': {
      // For `VECTOR SELECT`, we emit different inner loop code depending on the `numerical_action`
      // and `missing_vals` arguments, so extract those here first
      // TODO: We should also implement handling of the `error_action` argument

      const constantValue = argExpr => {
        // TODO: We can handle more complex expressions here if necessary if we used `reduceExpr`
        switch (argExpr.kind) {
          case 'number':
            return argExpr.value
          case 'keyword':
            if (argExpr.text === ':NA:') {
              return '_NA_'
            } else {
              throw new Error(`Unhandled keyword ${argExpr.text} in VECTOR SELECT argument`)
            }
          case 'variable-ref': {
            // TODO: This won't work for subscripted variable references; should fix this
            const variable = Model.varWithName(argExpr.varId)
            if (variable && variable.varType === 'const') {
              return variable.parsedEqn.rhs.expr.value
            } else {
              throw new Error(`Failed to resolve variable '${argExpr.varName}' for VECTOR SELECT argument`)
            }
          }
          default:
            throw new Error('The argument for VECTOR SELECT must resolve to a constant')
        }
      }

      const missingValsArg = constantValue(callExpr.args[2])
      const missingValsCode = missingValsArg === '_NA_' ? '_NA_' : cdbl(missingValsArg)

      // TODO: Handle other actions
      const numericalActionArg = constantValue(callExpr.args[3])
      switch (numericalActionArg) {
        case 0:
          initValue = '0.0'
          loopBodyOp = 'sum'
          break
        case 3:
          initValue = `-${maxNumber(ctx)}`
          loopBodyOp = 'max'
          break
        default:
          throw new Error(`Unsupported numerical_action value (${numericalActionArg}) for VECTOR SELECT`)
      }

      // Emit the temporary condition variable declaration
      vsCondVar = newTmpVarName()
      ctx.emitPreFormula(`  ${varDecl('bool', vsCondVar, 'false', ctx)}`)

      // Define the code that will be emitted in place of the `VECTOR SELECT` call
      tmpVar = newTmpVarName()
      returnCode = `${vsCondVar} ? ${tmpVar} : ${missingValsCode}`
      break
    }

    default:
      throw new Error(`Unexpected function call '${callExpr.fnId}' when reading '${ctx.variable.modelLHS}'`)
  }

  // Emit the temporary variable declaration
  if (!tmpVar) {
    tmpVar = newTmpVarName()
  }
  ctx.emitPreFormula(`  ${varDecl('double', tmpVar, initValue, ctx)}`)

  // Find all marked dimensions used in the array function arguments
  const markedDimIds = new Set()
  for (const argExpr of callExpr.args) {
    visitVariableRefs(argExpr, varRef => {
      if (varRef.subscriptRefs) {
        const subIds = varRef.subscriptRefs.map(subRef => subRef.subId)
        extractMarkedDims(subIds).forEach(dimId => markedDimIds.add(dimId))
      }
    })
  }

  // Open the array function loop(s)
  const indexDecl = ctx.outFormat === 'js' ? 'let' : 'size_t'
  for (const markedDimId of markedDimIds) {
    const n = sub(markedDimId).size
    const i = ctx.arrayIndexVars.index(markedDimId)
    ctx.emitPreFormula(`  for (${indexDecl} ${i} = 0; ${i} < ${n}; ${i}++) {`)
  }

  // Emit the body of the array function loop.  Note that we generate the expression code here
  // only after resolving the marked dimensions because the code that generates variable references
  // needs to take the marked dimension state into account.
  function innerStmt(argCode) {
    switch (loopBodyOp) {
      case 'sum':
        return `${tmpVar} += ${argCode};`
      case 'min':
        return `${tmpVar} = ${minFunc(ctx)}(${tmpVar}, ${argCode});`
      case 'max':
        return `${tmpVar} = ${maxFunc(ctx)}(${tmpVar}, ${argCode});`
      default:
        throw new Error(`Unexpected loop body op ${loopBodyOp} for VECTOR SELECT`)
    }
  }

  if (callExpr.fnId === '_VECTOR_SELECT') {
    // For `VECTOR SELECT`, the inner loop includes a conditional
    const selArrayCode = generateExpr(callExpr.args[0], ctx)
    const exprArrayCode = generateExpr(callExpr.args[1], ctx)
    if (ctx.outFormat === 'c') {
      ctx.emitPreFormula(`    if (bool_cond(${selArrayCode})) {`)
    } else {
      ctx.emitPreFormula(`    if (${selArrayCode}) {`)
    }
    ctx.emitPreFormula(`      ${innerStmt(exprArrayCode)}`)
    ctx.emitPreFormula(`      ${vsCondVar} = true;`)
    ctx.emitPreFormula('    }')
  } else {
    // For other functions, the inner loop is a simple statement
    const argCode = generateExpr(callExpr.args[0], ctx)
    ctx.emitPreFormula(`    ${innerStmt(argCode)}`)
  }

  // Close the array function loop(s)
  for (let i = 0; i < markedDimIds.size; i++) {
    ctx.emitPreFormula(`  }`)
  }

  if (returnCode) {
    // Emit the expression defined above in place of the array function
    return returnCode
  } else {
    // Emit the temporary variable into the expression in place of the array function call
    return tmpVar
  }
}

/**
 * Generate C/JS code for a `VECTOR ELM MAP` function call.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateVectorElmMapCall(callExpr, ctx) {
  function validateArg(index, name) {
    const arg = callExpr.args[index]
    if (arg.kind === 'variable-ref') {
      return arg
    } else {
      throw new Error(
        `VECTOR ELM MAP argument '${name}' must be a variable reference in code gen for '${ctx.variable.modelLHS}'`
      )
    }
  }

  // Process the vector argument
  const vecArg = validateArg(0, 'vec')
  let vecVarRefId = vecArg.varId
  const vecSubIds = vecArg.subscriptRefs.map(subRef => subRef.subId)

  // The marked dimension is an index in the vector argument
  let subFamily
  let subBase
  for (let subId of vecSubIds) {
    if (isIndex(subId)) {
      const index = sub(subId)
      subFamily = index.family
      subBase = index.value
      break
    }
  }
  if (subFamily === undefined) {
    throw new Error(`Failed to resolve index for VECTOR ELM MAP call in code gen for '${ctx.variable.modelLHS}'`)
  }

  // Process the offset argument
  const offsetArgCode = generateExpr(callExpr.args[1], ctx)

  // The `VECTOR ELM MAP` function replaces one subscript with a calculated offset from
  // a base index
  const rhsSubIds = vecSubIds
  const cSubscripts = rhsSubIds.map(rhsSubId => {
    if (isIndex(rhsSubId)) {
      let indexDecl
      switch (ctx.outFormat) {
        case 'c':
          indexDecl = `(size_t)(${subBase} + ${offsetArgCode})`
          break
        case 'js':
          indexDecl = `${subBase} + ${offsetArgCode}`
          break
        default:
          throw new Error(`Unhandled output format '${ctx.outFormat}'`)
      }
      return `[${subFamily}[${indexDecl}]]`
    } else {
      const subIndex = ctx.loopIndexVars.index(rhsSubId)
      return `[${rhsSubId}[${subIndex}]]`
    }
  })

  // Generate the RHS expression
  return `${vecVarRefId}${cSubscripts.join('')}`
}

/**
 * Generate C/JS code for a `VECTOR SORT ORDER` function call.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateVectorSortOrderCall(callExpr, ctx) {
  // Process the vector argument
  const vecArg = callExpr.args[0]
  if (vecArg.kind !== 'variable-ref') {
    throw new Error(`VECTOR SORT ORDER argument 'vec' must be a variable reference`)
  }
  let vecVarRefId = vecArg.varId
  const vecSubIds = vecArg.subscriptRefs.map(subRef => subRef.subId)

  // Process the sort direction argument
  const dirArg = generateExpr(callExpr.args[1], ctx)

  // The `VECTOR SORT ORDER` function iterates over the last subscript in the vector
  // argument, so determine the position of that subscript
  let dimId = vecSubIds[0]
  let subIndex = ctx.loopIndexVars.index(dimId)
  if (vecSubIds.length > 1) {
    // TODO: This code was from the old EquationGen; it seems to only handle the case of 2
    // dimensions, but what about other cases?
    vecVarRefId += `[${vecSubIds[0]}[${subIndex}]]`
    dimId = vecSubIds[1]
    subIndex = ctx.loopIndexVars.index(dimId)
  }

  // Generate the code that is emitted before the entire block (before any loops are opened)
  const tmpVarId = newTmpVarName()
  const dimSize = sub(dimId).size
  switch (ctx.outFormat) {
    case 'c':
      ctx.emitPreInnerLoop(`  double* ${tmpVarId} = _VECTOR_SORT_ORDER(${vecVarRefId}, ${dimSize}, ${dirArg});`)
      break
    case 'js':
      ctx.emitPreInnerLoop(`  let ${tmpVarId} = fns.VECTOR_SORT_ORDER(${vecVarRefId}, ${dimSize}, ${dirArg});`)
      break
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }

  // Generate the RHS expression used in the inner loop
  return `${tmpVarId}[${dimId}[${subIndex}]]`
}

/**
 * Generate C/JS code for an allocation function call.
 * This includes `_ALLOCATE_AVAILABLE`, `_DEMAND_AT_PRICE`, and `_SUPPLY_AT_PRICE`.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateAllocationFunctionCall(callExpr, ctx) {
  function validateArg(index, name) {
    const arg = callExpr.args[index]
    if (arg.kind === 'variable-ref') {
      return arg
    } else {
      throw new Error(`${callExpr.fnName} argument '${name}' must be a variable reference`)
    }
  }

  // Given a C/JS variable reference string (e.g., '_var[i][j]'), return that
  // string without the last N array index parts
  function cVarRefWithoutLastIndices(arg, count) {
    const varRef = ctx.cVarRef(arg)
    const origIndexParts = Model.splitRefId(varRef).subscripts
    if (origIndexParts.length < count) {
      throw new Error(`${callExpr.fnName} argument '${arg}' should have at least ${count} subscripts`)
    }
    const newIndexParts = origIndexParts.slice(0, -count)
    if (newIndexParts.length > 0) {
      return `${arg.varId}${newIndexParts.map(x => `[${x}]`).join('')}`
    } else {
      return arg.varId
    }
  }

  // Process the request argument.  Only include subscripts up until the last one;
  // the implementation function will iterate over the requesters array.
  const reqArg = validateArg(0, 'req')
  const reqRef = cVarRefWithoutLastIndices(reqArg, 1)

  // Process the pp (priority profile) argument.  Only include subscripts up until the
  // second to last one; the implementation function will iterate over the priority
  // profile array.
  const ppArg = validateArg(1, 'pp')
  const ppRef = cVarRefWithoutLastIndices(ppArg, 2)

  // Process the avail argument; include any subscripts
  const availArg = validateArg(2, 'avail')
  const availRef = ctx.cVarRef(availArg)

  // Allocation functions iterate over the last subscript in its first arg.
  // The `readEquation` process will have already verified that the last dimension matches
  // the last dimension for the LHS.
  const allocDimId = reqArg.subscriptRefs[reqArg.subscriptRefs.length - 1].subId
  const allocLoopIndexVar = ctx.loopIndexVars.index(allocDimId)

  // Generate the code that is emitted before the entire block (before any loops are opened)
  const tmpVarId = newTmpVarName()
  const numRequesters = sub(allocDimId).size
  switch (ctx.outFormat) {
    case 'c':
      ctx.emitPreInnerLoop(
        `  double* ${tmpVarId} = ${callExpr.fnId}(${reqRef}, (double*)${ppRef}, ${availRef}, ${numRequesters});`
      )
      break
    case 'js':
      // TODO: Implement allocation functions for JS
      // ctx.emitPreInnerLoop(
      //   `  let ${tmpVarId} = fns.ALLOCATE_AVAILABLE(${reqRef}, ${ppRef}, ${availRef}, ${numRequesters});`
      // )
      break
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }

  // Generate the RHS expression used in the inner loop
  return `${tmpVarId}[${allocDimId}[${allocLoopIndexVar}]]`
}

/**
 * Generate C/JS code for a `FIND MARKET PRICE` function call.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function generateFindMarketPriceFunctionCall(callExpr, ctx) {
  function validateArg(index, name) {
    const arg = callExpr.args[index]
    if (arg.kind === 'variable-ref') {
      return arg
    } else {
      throw new Error(`${callExpr.fnName} argument '${name}' must be a variable reference`)
    }
  }

  // Given a C/JS variable reference string (e.g., '_var[i][j]'), return that
  // string without the last N array index parts
  function cVarRefWithoutLastIndices(arg, count) {
    const varRef = ctx.cVarRef(arg)
    const origIndexParts = Model.splitRefId(varRef).subscripts
    if (origIndexParts.length < count) {
      throw new Error(`${callExpr.fnName} argument '${arg}' should have at least ${count} subscripts`)
    }
    const newIndexParts = origIndexParts.slice(0, -count)
    if (newIndexParts.length > 0) {
      return `${arg.varId}${newIndexParts.map(x => `[${x}]`).join('')}`
    } else {
      return arg.varId
    }
  }

  // Process the demand quantities argument.  Only include subscripts up until the last one;
  // the implementation function will iterate over the demand quantities array.
  const demandQtysArg = validateArg(0, 'demandQtys')
  const demandQtysRef = cVarRefWithoutLastIndices(demandQtysArg, 1)

  // Process the demand profiles argument.  Only include subscripts up until the
  // second to last one; the implementation function will iterate over the priority
  // profile array.
  const demandProfilesArg = validateArg(1, 'demandProfiles')
  const demandProfilesRef = cVarRefWithoutLastIndices(demandProfilesArg, 2)

  // The `FIND MARKET PRICE` implementation sums total demand over all demanders.
  // const demandDimId = demandQtysArg.subscriptRefs[demandQtysArg.subscriptRefs.length - 1].subId
  const demandSubId = demandQtysArg.subscriptRefs[demandQtysArg.subscriptRefs.length - 1].subId
  const demandDimId = sub(demandSubId).family
  const numDemanders = sub(demandDimId).size

  // Process the supply quantities argument.  Only include subscripts up until the last one;
  // the implementation function will iterate over the supply quantities array.
  const supplyQtysArg = validateArg(2, 'supplyQtys')
  const supplyQtysRef = cVarRefWithoutLastIndices(supplyQtysArg, 1)

  // Process the supply profiles argument.  Only include subscripts up until the
  // second to last one; the implementation function will iterate over the priority
  // profile array.
  const supplyProfilesArg = validateArg(3, 'supplyProfiles')
  const supplyProfilesRef = cVarRefWithoutLastIndices(supplyProfilesArg, 2)

  // The `FIND MARKET PRICE` implementation sums total supply over all suppliers.
  const supplySubId = supplyQtysArg.subscriptRefs[supplyQtysArg.subscriptRefs.length - 1].subId
  const supplyDimId = sub(supplySubId).family
  const numSuppliers = sub(supplyDimId).size

  // Generate the RHS expression
  return `_FIND_MARKET_PRICE(${demandQtysRef}, (double*)${demandProfilesRef}, ${supplyQtysRef}, (double*)${supplyProfilesRef}, ${numDemanders}, ${numSuppliers})`
}

/**
 * Recursively traverse the given expression and call the function when visiting a variable ref.
 *
 * @param {*} expr The expression to visit.
 * @param {*} onVarRef The function that is called when encountering a variable ref.
 */
function visitVariableRefs(expr, onVarRef) {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'keyword':
    case 'lookup-def':
      break

    case 'variable-ref':
      onVarRef(expr)
      break

    case 'parens':
    case 'unary-op':
      visitVariableRefs(expr.expr, onVarRef)
      break

    case 'binary-op':
      visitVariableRefs(expr.lhs, onVarRef)
      visitVariableRefs(expr.rhs, onVarRef)
      break

    case 'lookup-call':
      visitVariableRefs(expr.arg, onVarRef)
      break

    case 'function-call':
      expr.args.forEach(arg => visitVariableRefs(arg, onVarRef))
      break

    default:
      throw new Error(`Unhandled expression kind '${expr.kind}' in visitVariableRefs`)
  }
}

/**
 * Return a C or JS function reference for the given function ID and context.
 *
 * @param {string} fnId The function ID.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function fnRef(fnId, ctx) {
  switch (ctx.outFormat) {
    case 'c':
      return fnId
    case 'js':
      return `fns.${fnId.slice(1)}`
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}

/**
 * Return a C or JS variable declaration.
 *
 * @param {string} cVarType The variable type (only used for C code generation).
 * @param {string} varName The variable name.
 * @param {string} rhs The RHS for the declaration.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function varDecl(cVarType, varName, rhs, ctx) {
  switch (ctx.outFormat) {
    case 'c':
      return `${cVarType} ${varName} = ${rhs};`
    case 'js':
      return `let ${varName} = ${rhs};`
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}

/**
 * Return the "max number" constant for C or JS.
 *
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function maxNumber(ctx) {
  switch (ctx.outFormat) {
    case 'c':
      return 'DBL_MAX'
    case 'js':
      return 'Number.MAX_VALUE'
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}

/**
 * Return the "max" function for C or JS.
 *
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function maxFunc(ctx) {
  switch (ctx.outFormat) {
    case 'c':
      return 'fmax'
    case 'js':
      return 'Math.max'
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}

/**
 * Return the "min" function for C or JS.
 *
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function minFunc(ctx) {
  switch (ctx.outFormat) {
    case 'c':
      return 'fmin'
    case 'js':
      return 'Math.min'
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}

/**
 * Return the C or JS code for a subscript or dimension (loop index variable) used in
 * expression position.
 *
 * @param {string} indexValue The index number or code.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C/JS code.
 */
function indexExpr(indexValue, ctx) {
  switch (ctx.outFormat) {
    case 'c':
      // In the C case, we need to cast to double since the index variable will be
      // of type `size_t`, which is an unsigned type, but we want a signed type for
      // the rare cases where math is involved that makes it go negative
      if (isNaN(indexValue)) {
        // This is a (non-numeric) loop index variable reference, so cast to double
        return `((double)${indexValue})`
      } else {
        // This is a numeric index, no cast is necessary
        return indexValue
      }
    case 'js':
      // In the JS case, no cast is necessary
      return indexValue
    default:
      throw new Error(`Unhandled output format '${ctx.outFormat}'`)
  }
}
