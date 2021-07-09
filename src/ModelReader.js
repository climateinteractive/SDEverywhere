import { ModelVisitor } from 'antlr4-vensim'

export default class ModelReader extends ModelVisitor {
  constructor() {
    super()
    // stack of function names and argument indices
    this.callStack = []
  }
  currentFunctionName() {
    let n = this.callStack.length
    return n > 0 ? this.callStack[n - 1].fn : ''
  }
  setArgIndex(argIndex) {
    let n = this.callStack.length
    if (n > 0) {
      this.callStack[n - 1].argIndex = argIndex
    }
  }
  argIndexForFunctionName(name) {
    let argIndex
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (this.callStack[i].fn === name) {
        argIndex = this.callStack[i].argIndex
        break
      }
    }
    return argIndex
  }
  visitEquation(ctx) {
    ctx.lhs().accept(this)
    if (ctx.expr()) {
      ctx.expr().accept(this)
    } else if (ctx.constList()) {
      ctx.constList().accept(this)
    } else if (ctx.lookup()) {
      ctx.lookup().accept(this)
    } else {
      this.var.varType = 'data'
    }
  }
  visitLhs(ctx) {
    // An LHS may have a subscript list after the var name.
    // If it has an EXCEPT clause, it will have one or more other subscript lists there too.
    let subscriptLists = ctx.subscriptList()
    if (subscriptLists.length > 0) {
      for (let i = 0; i < subscriptLists.length; i++) {
        subscriptLists[i].accept(this)
      }
    }
  }

  // Function calls and variables

  visitCall(ctx) {
    if (ctx.exprList()) {
      ctx.exprList().accept(this)
    }
  }
  visitExprList(ctx) {
    let exprs = ctx.expr()
    // Set the argument index in an instance property so derived classes can determine argument position.
    for (let i = 0; i < exprs.length; i++) {
      this.setArgIndex(i)
      exprs[i].accept(this)
    }
  }
  visitVar(ctx) {
    if (ctx.subscriptList()) {
      ctx.subscriptList().accept(this)
    }
  }

  // Lookups

  visitLookup(ctx) {
    if (ctx.lookupRange()) {
      ctx.lookupRange().accept(this)
    }
    if (ctx.lookupPointList()) {
      ctx.lookupPointList().accept(this)
    }
  }
  visitLookupCall(ctx) {
    if (ctx.subscriptList()) {
      ctx.subscriptList().accept(this)
    }
  }

  // Unary operators

  visitNegative(ctx) {
    ctx.expr().accept(this)
  }
  visitPositive(ctx) {
    ctx.expr().accept(this)
  }
  visitNot(ctx) {
    ctx.expr().accept(this)
  }

  // Binary operators

  visitPower(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitMulDiv(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitAddSub(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitRelational(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitEquality(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitAnd(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }
  visitOr(ctx) {
    ctx.expr(0).accept(this)
    ctx.expr(1).accept(this)
  }

  // Tokens

  visitParens(ctx) {
    ctx.expr().accept(this)
  }
}
