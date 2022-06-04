import antlr4 from 'antlr4'
import { ModelLexer, ModelParser, ModelVisitor } from 'antlr4-vensim'
import { canonicalName } from './Helpers.js'
import Model from './Model.js'

/**
 * Reads an expression and determines if it resolves to a constant numeric value.
 * This depends on having access to the model variables, so this should be used
 * only after the `readVariables` process has been completed and the spec file
 * has been loaded.
 */
export default class ExprReader extends ModelVisitor {
  constructor() {
    super()
  }

  read(exprText) {
    let chars = new antlr4.InputStream(exprText)
    let lexer = new ModelLexer(chars)
    let tokens = new antlr4.CommonTokenStream(lexer)
    let parser = new ModelParser(tokens)
    parser.buildParseTrees = true
    let expr = parser.expr()
    expr.accept(this)

    return {
      constantValue: this.constantValue
    }
  }

  // Constants

  visitConst(ctx) {
    const constantValue = parseFloat(ctx.Const().getText())
    if (!Number.isNaN(constantValue)) {
      this.constantValue = constantValue
    } else {
      this.constantValue = undefined
    }
  }
  visitConstList() {
    this.constantValue = undefined
  }

  // Function calls and variables

  visitCall() {
    // Treat function calls as non-constant (can't easily determine if they
    // resolve to a constant)
    this.constantValue = undefined
  }
  visitExprList() {
    // Treat function calls as non-constant (can't easily determine if they
    // resolve to a constant)
    this.constantValue = undefined
  }
  visitVar(ctx) {
    // Determine whether this variable has a constant value
    const varName = ctx.Id().getText().trim()
    const cName = canonicalName(varName)
    const v = Model.varWithName(cName)
    const modelFormula = v?.modelFormula?.trim() || ''
    const isNumber = modelFormula.match(/^[+-]?\d+(\.\d+)?$/)
    const canBeOverridden = Model.isInputVar(cName)
    if (v && isNumber && !canBeOverridden) {
      const numValue = parseFloat(modelFormula)
      if (!Number.isNaN(numValue)) {
        this.constantValue = numValue
      } else {
        this.constantValue = undefined
      }
    } else {
      this.constantValue = undefined
    }
  }

  // Lookups

  visitLookup() {
    this.constantValue = undefined
  }
  visitLookupCall() {
    this.constantValue = undefined
  }

  // Unary operators

  visitNegative(ctx) {
    super.visitNegative(ctx)
    if (this.constantValue !== undefined) {
      this.constantValue = -this.constantValue
    }
  }
  visitPositive(ctx) {
    super.visitPositive(ctx)
    if (this.constantValue !== undefined) {
      this.constantValue = +this.constantValue
    }
  }
  visitNot(ctx) {
    super.visitNot(ctx)
    if (this.constantValue !== undefined) {
      this.constantValue = !this.constantValue
    }
  }

  // Binary operators

  visitBinaryArgs(ctx, combine) {
    ctx.expr(0).accept(this)
    const constantValue0 = this.constantValue
    ctx.expr(1).accept(this)
    const constantValue1 = this.constantValue
    if (constantValue0 !== undefined && constantValue1 !== undefined) {
      this.constantValue = combine(constantValue0, constantValue1)
    } else {
      this.constantValue = undefined
    }
  }

  visitPower(ctx) {
    this.visitBinaryArgs(ctx, (a, b) => Math.pow(a, b))
  }
  visitMulDiv(ctx) {
    this.visitBinaryArgs(ctx, (a, b) => {
      if (ctx.op.type === ModelLexer.Star) {
        return a * b
      } else {
        return a / b
      }
    })
  }
  visitAddSub(ctx) {
    this.visitBinaryArgs(ctx, (a, b) => {
      if (ctx.op.type === ModelLexer.Plus) {
        return a + b
      } else {
        return a - b
      }
    })
  }
  visitRelational(ctx) {
    this.visitBinaryArgs(ctx, (a, b) => {
      if (ctx.op.type === ModelLexer.Less) {
        return a < b ? 1 : 0
      } else if (ctx.op.type === ModelLexer.Greater) {
        return a > b ? 1 : 0
      } else if (ctx.op.type === ModelLexer.LessEqual) {
        return a <= b ? 1 : 0
      } else {
        return a >= b ? 1 : 0
      }
    })
  }
  visitEquality(ctx) {
    this.visitBinaryArgs(ctx, (a, b) => {
      if (ctx.op.type === ModelLexer.Equal) {
        return a === b ? 1 : 0
      } else {
        return a !== b ? 1 : 0
      }
    })
  }
  visitAnd(ctx) {
    // For AND expressions, we don't need both sides to have a constant value; as
    // long as one side is known to be false, then the expression resolves to false
    ctx.expr(0).accept(this)
    const constantValue0 = this.constantValue
    ctx.expr(1).accept(this)
    const constantValue1 = this.constantValue
    if (constantValue0 !== undefined && constantValue1 !== undefined) {
      this.constantValue = constantValue0 && constantValue1
    } else if (constantValue0 !== undefined && !constantValue0) {
      this.constantValue = 0
    } else if (constantValue1 !== undefined && !constantValue1) {
      this.constantValue = 0
    } else {
      this.constantValue = undefined
    }
  }
  visitOr(ctx) {
    // For OR expressions, we don't need both sides to have a constant value; as
    // long as one side is known to be true, then the expression resolves to true
    ctx.expr(0).accept(this)
    const constantValue0 = this.constantValue
    ctx.expr(1).accept(this)
    const constantValue1 = this.constantValue
    if (constantValue0 !== undefined && constantValue1 !== undefined) {
      this.constantValue = constantValue0 || constantValue1
    } else if (constantValue0 !== undefined && constantValue0) {
      this.constantValue = 1
    } else if (constantValue1 !== undefined && constantValue1) {
      this.constantValue = 1
    } else {
      this.constantValue = undefined
    }
  }

  // Tokens

  visitParens(ctx) {
    super.visitParens(ctx)
  }
}
