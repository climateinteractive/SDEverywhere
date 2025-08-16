// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { ModelLexer, ModelVisitor } from 'antlr4-vensim'

import { canonicalFunctionId, canonicalId } from '../../_shared/canonical-id'

import { createAntlrParser } from './antlr-parser'

export class ExprReader extends ModelVisitor {
  constructor() {
    super()

    // Stack of function names and argument indices encountered on the RHS
    this.callStack = []
  }

  /**
   * Parse the given Vensim expression definition and return an `Expr` AST node.
   *
   * @public
   * @param {string} exprText A string containing the Vensim expression.
   * @returns {import('../../ast/ast-types').Expr} An `Expr` AST node.
   */
  /*public*/ parse(exprText /*: string*/) /*: Expr*/ {
    const parser = createAntlrParser(exprText)
    const exprCtx = parser.expr()
    return this.visitExpr(exprCtx)
  }

  /**
   * Process the given ANTLR `ExprContext` from an already parsed Vensim
   * expression definition.
   *
   * @public
   * @param {import('antlr4-vensim').ExprContext} ctx The ANTLR `ExprContext`.
   * @returns {import('../../ast/ast-types').Expr} An `Expr` AST node.
   */
  /*public*/ visitExpr(ctx /*: ExprContext*/) /*: Expr*/ {
    ctx.accept(this)
    return this.expr
  }

  //
  // Constants
  //

  visitConst(ctx) {
    const text = ctx.Const().getText()
    if (text.startsWith("'") && text.endsWith("'")) {
      // Treat it as a string
      this.expr = {
        kind: 'string',
        text: text.substr(1, text.length - 2)
      }
    } else {
      // Treat it as a number
      const value = parseFloat(text)
      this.expr = {
        kind: 'number',
        value,
        text
      }
    }
  }

  //
  // Keywords
  //

  visitKeyword(ctx) {
    const text = ctx.Keyword().getText()
    this.expr = {
      kind: 'keyword',
      text
    }
  }

  //
  // Function calls and variables
  //

  visitCall(ctx) {
    // Convert the function name from Vensim to C format
    const vensimFnName = ctx.Id().getText()
    const fnId = canonicalFunctionId(vensimFnName)
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
    const varId = canonicalId(vensimVarName)

    // Process the subscripts (if any) that follow the variable name
    this.subscripts = undefined
    super.visitVar(ctx)
    const subscriptNames = this.subscripts
    const subscriptRefs = subscriptNames?.map(name => {
      return {
        subName: name,
        subId: canonicalId(name)
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
    const lookupVarId = canonicalId(lookupVarName)

    // Process any subscripts that follow the variable name
    if (ctx.subscriptList()) {
      ctx.subscriptList().accept(this)
    }
    const subscriptNames = this.subscripts
    const subscriptRefs = subscriptNames?.map(name => {
      return {
        subName: name,
        subId: canonicalId(name)
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

    const child = this.expr
    this.expr = {
      kind: 'parens',
      expr: child
    }
  }
}
