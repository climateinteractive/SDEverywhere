// Copyright (c) 2023 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser, ModelVisitor } from 'antlr4-vensim'

import { canonicalName, cFunctionName } from '../../_shared/names'

/**
 * Create a `ModelParser` for the given model text, which can be the
 * contents of an entire `mdl` file, or a portion of one (e.g., an
 * expression or definition).
 *
 * @param input The string containing the model text.
 * @return A `ModelParser` from which a parse tree can be obtained.
 */
function createParser(input /*: string*/) /*: ModelParser*/ {
  const chars = new antlr4.InputStream(input)
  const lexer = new ModelLexer(chars)
  const tokens = new antlr4.CommonTokenStream(lexer)
  const parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  return parser
}

export class ExprReader extends ModelVisitor {
  constructor() {
    super()

    // Stack of function names and argument indices encountered on the RHS
    this.callStack = []
  }

  /*public*/ parse(exprText /*: string*/) /*: Expr*/ {
    const parser = createParser(exprText)
    const exprCtx = parser.expr()
    return this.visitExpr(exprCtx)
  }

  /*public*/ visitExpr(exprCtx /*: ExprContext*/) /*: Expr*/ {
    exprCtx.accept(this)
    return this.expr
  }

  // /**
  //  * Return the name of the current function on top of the call stack.
  //  */
  // /*private*/ currentFunctionName() {
  //   const n = this.callStack.length
  //   return n > 0 ? this.callStack[n - 1].fn : ''
  // }

  // /**
  //  * Set the argument index in the current function call on top of the call stack.
  //  * This may be set in the exprList visitor and picked up in the var visitor to
  //  * facilitate special argument handling.
  //  */
  // /*private*/ setArgIndex(argIndex) {
  //   const n = this.callStack.length
  //   if (n > 0) {
  //     this.callStack[n - 1].argIndex = argIndex
  //   }
  // }

  // /**
  //  * Search the call stack for the function name. Return the current argument index
  //  * or undefined if not found.
  //  */
  // /*private*/ argIndexForFunctionName(name) {
  //   let argIndex
  //   for (let i = this.callStack.length - 1; i >= 0; i--) {
  //     if (this.callStack[i].fn === name) {
  //       argIndex = this.callStack[i].argIndex
  //       break
  //     }
  //   }
  //   return argIndex
  // }

  //
  // Constants
  //

  visitConst(ctx) {
    const value = parseFloat(ctx.Const().getText())
    this.expr = {
      kind: 'number',
      value
    }
  }

  //
  // Function calls and variables
  //

  visitCall(ctx) {
    // Convert the function name from Vensim to C format
    const vensimFnName = ctx.Id().getText()
    const fnId = cFunctionName(vensimFnName)
    this.callStack.push({ fn: fnId, args: [] })
    super.visitCall(ctx)
    const callInfo = this.callStack.pop()
    this.expr = {
      kind: 'function-call',
      fnName: vensimFnName,
      fnId: fnId,
      args: callInfo.args
    }
  }

  visitExprList(ctx) {
    const exprs = ctx.expr()
    for (let i = 0; i < exprs.length; i++) {
      // this.setArgIndex(i)
      exprs[i].accept(this)
      const n = this.callStack.length
      if (n > 0) {
        this.callStack[n - 1].args.push(this.expr)
      }
    }
  }

  visitVar(ctx) {
    // Convert the variable name from Vensim to C format
    const vensimVarName = ctx.Id().getText().trim()
    const varId = canonicalName(vensimVarName)

    // Process the subscripts (if any) that follow the variable name
    this.subscripts = undefined
    super.visitVar(ctx)
    const subscriptNames = this.subscripts
    const subscriptRefs = subscriptNames?.map(name => {
      return {
        subName: name,
        subId: canonicalName(name)
      }
    })
    this.subscripts = undefined

    this.expr = {
      kind: 'variable-ref',
      varName: vensimVarName,
      varId: varId,
      subscriptRefs
    }
  }

  visitSubscriptList(ctx) {
    // Get the subscripts found in the var name
    this.subscripts = ctx.Id().map(id => id.getText())
  }

  //
  // Lookups
  //

  getPoint(lookupPoint) {
    const exprs = lookupPoint.expr()
    if (exprs.length >= 2) {
      return [parseFloat(exprs[0].getText()), parseFloat(exprs[1].getText())]
    }
  }

  visitLookupRange(ctx) {
    this.lookupRange = ctx.lookupPoint().map(p => this.getPoint(p))
    super.visitLookupRange(ctx)
  }

  visitLookupPointList(ctx) {
    this.lookupPoints = ctx.lookupPoint().map(p => this.getPoint(p))
    super.visitLookupPointList(ctx)
  }

  visitLookupArg(ctx) {
    super.visitLookupArg(ctx)
    let range
    if (this.lookupRange && this.lookupRange.length === 2) {
      range = {
        min: this.lookupRange[0],
        max: this.lookupRange[1]
      }
    }
    this.expr = {
      kind: 'lookup-def',
      range,
      points: this.lookupPoints
    }
    this.lookupRange = undefined
    this.lookupPoints = undefined
  }

  visitLookupCall(ctx) {
    // Process the lookup variable name
    const lookupVarName = ctx.Id().getText()
    const lookupVarId = canonicalName(lookupVarName)

    // Process any subscripts that follow the variable name
    if (ctx.subscriptList()) {
      ctx.subscriptList().accept(this)
    }
    const subscriptNames = this.subscripts
    const subscriptRefs = subscriptNames?.map(name => {
      return {
        subName: name,
        subId: canonicalName(name)
      }
    })
    this.subscripts = undefined

    const lookupVarRef = {
      kind: 'variable-ref',
      varName: lookupVarName,
      varId: lookupVarId,
      subscriptRefs
    }

    // Process the single lookup argument
    ctx.expr().accept(this)
    const lookupArg = this.expr

    this.expr = {
      kind: 'lookup-call',
      varRef: lookupVarRef,
      arg: lookupArg
    }
  }

  //
  // Unary operators
  //

  completeUnary(op /*: UnaryOp*/) {
    const child = this.expr
    this.expr = {
      kind: 'unary-op',
      op,
      expr: child
    }
  }

  visitNegative(ctx) {
    super.visitNegative(ctx)
    this.completeUnary('-')
  }

  visitPositive(ctx) {
    super.visitPositive(ctx)
    this.completeUnary('+')
  }

  visitNot(ctx) {
    super.visitNot(ctx)
    this.completeUnary(':NOT:')
  }

  //
  // Binary operators
  //

  visitBinaryArgs(ctx, op /*: BinaryOp*/) {
    ctx.expr(0).accept(this)
    const lhs = this.expr
    ctx.expr(1).accept(this)
    const rhs = this.expr
    this.expr = {
      kind: 'binary-op',
      lhs,
      op,
      rhs
    }
  }

  visitPower(ctx) {
    this.visitBinaryArgs(ctx, '^')
  }

  visitMulDiv(ctx) {
    this.visitBinaryArgs(ctx, ctx.op.type === ModelLexer.Star ? '*' : '/')
  }

  visitAddSub(ctx) {
    this.visitBinaryArgs(ctx, ctx.op.type === ModelLexer.Plus ? '+' : '-')
  }

  visitRelational(ctx) {
    let op
    switch (ctx.op.type) {
      case ModelLexer.Less:
        op = '<'
        break
      case ModelLexer.Greater:
        op = '>'
        break
      case ModelLexer.LessEqual:
        op = '<='
        break
      case ModelLexer.GreaterEqual:
        op = '>='
        break
      default:
        throw new Error(`Unexpected relational operator '${op}'`)
    }
    this.visitBinaryArgs(ctx, op)
  }

  visitEquality(ctx) {
    this.visitBinaryArgs(ctx, ctx.op.type === ModelLexer.Equal ? '=' : '<>')
  }

  visitAnd(ctx) {
    this.visitBinaryArgs(ctx, ':AND:')
  }

  visitOr(ctx) {
    this.visitBinaryArgs(ctx, ':OR:')
  }

  //
  // Tokens
  //

  visitParens(ctx) {
    super.visitParens(ctx)
  }
}
