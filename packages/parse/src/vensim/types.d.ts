// Copyright (c) 2023 Climate Interactive / New Venture Fund

// XXX: Workaround for lack of type declarations for the `antlr4` and `antlr4-vensim` packages
declare module 'antlr4'
declare module 'antlr4-vensim' {
  class ModelLexer {
    constructor(input: unknown)
  }

  interface ExprContext {
    accept(visitor: ModelVisitor): unknown
    expr(index: number): ExprContext
  }

  class ModelParser {
    buildParseTrees: boolean
    constructor(tokens: unknown)
    expr(): ExprContext
  }
  class ModelVisitor {}
}
