// Copyright (c) 2023 Climate Interactive / New Venture Fund

// XXX: Workaround for lack of type declarations for the `antlr4` and `antlr4-vensim` packages
declare module 'antlr4'
declare module 'antlr4-vensim' {
  class ModelLexer {
    constructor(input: unknown)
  }

  interface SubscriptRangeContext {
    accept(visitor: ModelVisitor): unknown
    subscriptRange(index: number): SubscriptRangeContext
  }

  interface ExprContext {
    accept(visitor: ModelVisitor): unknown
    expr(index: number): ExprContext
  }

  interface EquationContext {
    accept(visitor: ModelVisitor): unknown
    equation(index: number): EquationContext
  }

  interface ModelContext {
    accept(visitor: ModelVisitor): unknown
    model(): ModelContext
  }

  class ModelParser {
    buildParseTrees: boolean
    constructor(tokens: unknown)
    subscriptRange(): SubscriptRangeContext
    expr(): ExprContext
    equation(): EquationContext
    model(): ModelContext
  }

  class ModelVisitor {}
}
