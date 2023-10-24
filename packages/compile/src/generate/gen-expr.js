import { cdbl, newTmpVarName } from '../_shared/helpers.js'
import { extractMarkedDims, isIndex, normalizeSubscripts, sub } from '../_shared/subscript.js'

import Model from '../model/model.js'

/**
 * @typedef {Object} GenExprContext The context for a `generateExpr` call.
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-constants' | 'init-lookups' | 'init-levels' | 'eval'} mode The code generation mode.
 * @param {string} cLhs The C code for the LHS variable reference.
 * @param {LoopIndexVars} loopIndexVars The loop index state used for LHS dimensions.
 * @param {LoopIndexVars} arrayIndexVars The loop index state used for array functions (that use marked dimensions).
 * @param {() => void} resetMarkedDims Function that resets the marked dimension state.
 * @param {(dimId: string) => void} addMarkedDim Function that adds the given dimension to the set of marked dimensions.
 * @param {(s: string) => void} emitPreBlock Function that will cause the given code to be appended to the chunk that
 * precedes the generated block of code for the entire equation.
 * @param {(s: string) => void} emitPreFormula Function that will cause the given code to be appended to the chunk that
 * precedes the generated formula (the primary, inner-most part of the equation).
 * @param {(varRef: VariableRef) => string} cVarRef Function that returns a C variable reference for a variable
 * referenced in a RHS expression.
 * @param {(varId: string) => string} cVarRefWithLhsSubscripts Function that returns a C variable reference that
 * takes into account the relevant LHS subscripts.
 */

/**
 * Generate the RHS code for the given expression.
 *
 * TODO: Types
 *
 * @param {*} expr The expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
export function generateExpr(expr, ctx) {
  switch (expr.kind) {
    case 'number':
      return cdbl(expr.value)

    case 'string':
      return `'${expr.text}'`

    case 'keyword':
      return expr.text

    case 'variable-ref':
      return ctx.cVarRef(expr)

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
        return `pow(${lhs}, ${rhs})`
      } else {
        let op
        switch (expr.op) {
          case '=':
            op = '=='
            break
          case '<>':
            op = '!='
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
      // function calls, and those are transformed into a generated lookup variable, so
      // we should never reach here and therefore throw an error to make that clear
      throw new Error(`Unexpected 'lookup-def' when reading ${ctx.variable.modelLHS}`)

    case 'lookup-call': {
      // For Vensim models, the antlr4-vensim grammar has separate definitions for lookup
      // calls and function calls, but in practice they can only be differentiated in the
      // case where the lookup has subscripts; when there are no subscripts, they get
      // treated like normal function calls.  Therefore we need to handle these in two
      // places.  The code here deals with lookup calls that involve a lookup with one
      // or more dimensions.  The `default` case in `generateFunctionCall` deals with
      // lookup calls that involve a non-subscripted lookup variable.
      const lookupVar = Model.varWithName(expr.varRef.varId)
      return generateLookupCall(lookupVar, expr.arg, ctx)
    }

    case 'function-call':
      return generateFunctionCall(expr, ctx)

    default:
      throw new Error(`Unhandled expression kind '${expr.kind}' when reading ${ctx.variable.modelLHS}`)
  }
}

/**
 * Generate C code for the given function call.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
function generateFunctionCall(callExpr, ctx) {
  const fnId = callExpr.fnId

  switch (fnId) {
    //
    //
    // Simple functions
    //
    // Each of these functions is implemented with a C function or macro, so no further processing
    // is required other than to emit the C function/macro call.
    //
    //

    case '_ABS':
    case '_COS':
    case '_EXP':
    case '_GAME':
    case '_GAMMA_LN':
    case '_GET_DATA_BETWEEN_TIMES':
    case '_IF_THEN_ELSE':
    case '_INTEGER':
    case '_LN':
    case '_LOOKUP_BACKWARD':
    case '_LOOKUP_FORWARD':
    case '_LOOKUP_INVERT':
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
    case '_XIDZ':
    case '_ZIDZ': {
      // For simple functions, emit a C function call with a generated C expression for each argument
      const args = callExpr.args.map(argExpr => generateExpr(argExpr, ctx))
      return `${fnId}(${args.join(', ')})`
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
      if (ctx.mode.startsWith('init')) {
        return generateLevelInit(callExpr, ctx)
      } else if (ctx.mode === 'eval') {
        return generateLevelEval(callExpr, ctx)
      } else {
        throw new Error(`Invalid code gen mode '${ctx.mode}' for level variable ${ctx.variable.modelLHS}`)
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
      const delayVarRef = ctx.cVarRef(delayVar.parsedEqn.lhs.varRef)
      // TODO: For now, extract the RHS subscripts from the ones that were computed for the
      // delay variable.  We should add a variant of cVarRef that returns only the RHS subs.
      // return `(${delayVar.varName}${rhsSubs} / ${ctx.variable.delayTimeVarName}${rhsSubs})`
      const delayVarParts = delayVarRef.split('[')
      const rhsSubs = delayVarParts.length > 1 ? `[${delayVarParts[1]}` : ''
      return `(${delayVarRef} / ${ctx.variable.delayTimeVarName}${rhsSubs})`
    }

    case '_NPV': {
      const npvVar = Model.varWithRefId(ctx.variable.npvVarName)
      return ctx.cVarRef(npvVar.parsedEqn.lhs.varRef)
    }

    case '_SMOOTH':
    case '_SMOOTHI':
    case '_SMOOTH3':
    case '_SMOOTH3I': {
      const smoothVar = Model.varWithRefId(ctx.variable.smoothVarRefId)
      return ctx.cVarRef(smoothVar.parsedEqn.lhs.varRef)
    }

    case '_TREND': {
      const trendVar = Model.varWithRefId(ctx.variable.trendVarName)
      return ctx.cVarRef(trendVar.parsedEqn.lhs.varRef)
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
    // Special functions
    //
    //

    case '_GET_DIRECT_CONSTANTS':
      // TODO: Should not get here (throw error)
      break

    case '_INITIAL':
      // In init mode, only emit the initial expression without the INITIAL function call
      if (ctx.mode.startsWith('init')) {
        return generateExpr(callExpr.args[0], ctx)
      } else {
        throw new Error(`Invalid code gen mode '${ctx.mode}' for variable ${ctx.variable.modelLHS} with INITIAL`)
      }

    case '_ALLOCATE_AVAILABLE':
    case '_ELMCOUNT':
    case '_WITH_LOOKUP':
      break

    case '_GET_DIRECT_DATA':
    case '_GET_DIRECT_LOOKUPS':
      break

    default: {
      // XXX: See if the function name is actually the name of a lookup variable.  (See
      // comment for 'lookup-call' case above about why this is needed.)
      const lookupVar = Model.varWithName(fnId.toLowerCase())
      if (lookupVar?.isLookup()) {
        // Transform to a `_LOOKUP` function call
        return generateLookupCall(lookupVar, callExpr.args[0], ctx)
      } else {
        // TODO: For now we throw an error if the function is not yet implemented in SDE.
        // This is helpful in the short term while we implement the new code generator, but
        // it does not work in the case of models that use custom macros.  We need to provide
        // a way for users to disable this error, or explicitly declare a list of function
        // names to ignore or treat as user-implemented macros.
        throw new Error(`Unhandled function '${fnId}' when reading ${ctx.variable.modelLHS}`)
      }
    }
  }
}

/**
 * Generate C code for the given level variable at init time.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
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
    case '_DELAY_FIXED':
    case '_SAMPLE_IF_TRUE':
      initialArgIndex = 2
      break
    case '_DEPRECIATE_STRAIGHTLINE':
      initialArgIndex = 3
      break
    default:
      throw new Error(`Unhandled function '${fnId}' in code gen for level variable ${ctx.variable.modelLHS}`)
  }
  const initialArg = callExpr.args[initialArgIndex]
  return generateExpr(initialArg, ctx)
  //   // For DELAY FIXED and DEPRECIATE STRAIGHTLINE, also initialize the support struct
  //   // out of band, as they are not Vensim vars.
  //   if (fn === '_DELAY_FIXED') {
  //     let fixedDelay = `${this.var.fixedDelayVarName}${this.lhsSubscriptGen(this.var.subscripts)}`
  //     this.emit(`;\n  ${fixedDelay} = __new_fixed_delay(${fixedDelay}, `)
  //     this.setArgIndex(1)
  //     exprs[1].accept(this)
  //     this.emit(', ')
  //     this.setArgIndex(2)
  //     exprs[2].accept(this)
  //     this.emit(')')
  //   } else if (fn === '_DEPRECIATE_STRAIGHTLINE') {
  //     let depreciation = `${this.var.depreciationVarName}${this.lhsSubscriptGen(this.var.subscripts)}`
  //     this.emit(`;\n  ${depreciation} = __new_depreciation(${depreciation}, `)
  //     this.setArgIndex(1)
  //     exprs[1].accept(this)
  //     this.emit(', ')
  //     this.setArgIndex(2)
  //     exprs[3].accept(this)
  //     this.emit(')')
  //   }
}

/**
 * Generate C code for the given level variable at eval time.
 *
 * TODO: Types
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
function generateLevelEval(callExpr, ctx) {
  const fnId = callExpr.fnId

  function generateCall(args) {
    return `${fnId}(${args.join(', ')})`
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
      return generateCall(args)
    }

    default:
      throw new Error(`Unhandled function '${fnId}' in code gen for level variable ${ctx.variable.modelLHS}`)
  }
}

/**
 * Generate C code for a lookup call.
 *
 * TODO: Types
 *
 * @param {*} lookupVar The lookup `Variable` instance.
 * @param {*} argExpr The parsed `Expr` for the single argument for the lookup.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
function generateLookupCall(lookupVar, argExpr, ctx) {
  // TODO: Take subscripts into account
  const varId = lookupVar.varName
  const arg = generateExpr(argExpr, ctx)
  return `_LOOKUP(${varId}, ${arg})`
}

/**
 * Generate C code for an array function call (e.g., `SUM`).
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
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
      initValue = 'DBL_MAX'
      loopBodyOp = 'min'
      break

    case '_VMAX':
      initValue = '-DBL_MAX'
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
          initValue = '-DBL_MAX'
          loopBodyOp = 'max'
          break
        default:
          throw new Error(`Unsupported numerical_action value (${numericalActionArg}) for VECTOR SELECT`)
      }

      // Emit the temporary condition variable declaration
      vsCondVar = newTmpVarName()
      ctx.emitPreFormula(`  bool ${vsCondVar} = false;`)

      // Define the code that will be emitted in place of the `VECTOR SELECT` call
      tmpVar = newTmpVarName()
      returnCode = `${vsCondVar} ? ${tmpVar} : ${missingValsCode}`
      break
    }

    default:
      throw new Error(`Unexpected function call '${callExpr.fnId}' when reading ${ctx.variable.modelLHS}`)
  }

  // Emit the temporary variable declaration
  if (!tmpVar) {
    tmpVar = newTmpVarName()
  }
  ctx.emitPreFormula(`  double ${tmpVar} = ${initValue};`)

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
  for (const markedDimId of markedDimIds) {
    ctx.addMarkedDim(markedDimId)
    const n = sub(markedDimId).size
    const i = ctx.arrayIndexVars.index(markedDimId)
    ctx.emitPreFormula(`  for (size_t ${i} = 0; ${i} < ${n}; ${i}++) {`)
  }

  // Emit the body of the array function loop.  Note that we generate the expression code here
  // only after resolving the marked dimensions because the code that generates variable references
  // needs to take the marked dimension state into account.
  function innerStmt(argCode) {
    switch (loopBodyOp) {
      case 'sum':
        return `${tmpVar} += ${argCode};`
      case 'min':
        return `${tmpVar} = fmin(${tmpVar}, ${argCode});`
      case 'max':
        return `${tmpVar} = fmax(${tmpVar}, ${argCode});`
      default:
        throw new Error(`Unexpected loop body op ${loopBodyOp} for VECTOR SELECT`)
    }
  }

  if (callExpr.fnId === '_VECTOR_SELECT') {
    // For `VECTOR SELECT`, the inner loop includes a conditional
    const selArrayCode = generateExpr(callExpr.args[0], ctx)
    const exprArrayCode = generateExpr(callExpr.args[1], ctx)
    ctx.emitPreFormula(`    if (bool_cond(${selArrayCode})) {`)
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

  // Reset marked dim state
  ctx.resetMarkedDims()

  if (returnCode) {
    // Emit the expression defined above in place of the array function
    return returnCode
  } else {
    // Emit the temporary variable into the expression in place of the array function call
    return tmpVar
  }
}

/**
 * Generate C code for a `VECTOR ELM MAP` function call.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
function generateVectorElmMapCall(callExpr, ctx) {
  // Process the vector argument
  const vecArg = callExpr.args[0]
  if (vecArg.kind !== 'variable-ref') {
    throw new Error('First (vector) argument for VECTOR ELM MAP must be a variable reference')
  }
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
  // TODO: Throw error if no index was found

  // Process the offset argument
  const offsetArg = callExpr.args[1]
  if (offsetArg.kind !== 'variable-ref') {
    throw new Error('Second (offset) argument for VECTOR ELM MAP must be a variable reference')
  }
  const offsetVarRefId = ctx.cVarRef(offsetArg)

  // The `VECTOR ELM MAP` function replaces one subscript with a calculated offset from
  // a base index
  const rhsSubIds = normalizeSubscripts(vecSubIds)
  const cSubscripts = rhsSubIds.map(rhsSubId => {
    if (isIndex(rhsSubId)) {
      return `[${subFamily}[(size_t)(${subBase} + ${offsetVarRefId})]]`
    } else {
      const subIndex = ctx.loopIndexVars.index(rhsSubId)
      return `[${rhsSubId}[${subIndex}]]`
    }
  })

  // Generate the RHS expression
  return `${vecVarRefId}${cSubscripts.join('')}`
}

/**
 * Generate C code for a `VECTOR SORT ORDER` function call.
 *
 * @param {*} callExpr The function call expression from the parsed model.
 * @param {GenExprContext} ctx The context used when generating code for the expression.
 * @return {string} The generated C code.
 */
function generateVectorSortOrderCall(callExpr, ctx) {
  // Process the vector argument
  const vecArg = callExpr.args[0]
  if (vecArg.kind !== 'variable-ref') {
    throw new Error('First (vector) argument for VECTOR SORT ORDER must be a variable reference')
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
  ctx.emitPreBlock(`  double* ${tmpVarId} = _VECTOR_SORT_ORDER(${vecVarRefId}, ${dimSize}, ${dirArg});`)

  // Generate the RHS expression used in the inner loop
  return `${tmpVarId}[${dimId}[${subIndex}]]`
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
