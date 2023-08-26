// Copyright (c) 2023 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser, ModelVisitor } from 'antlr4-vensim'

import { EquationReader } from './equation-reader'

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

export class ModelReader extends ModelVisitor {
  constructor() {
    super()
    this.subscriptRanges = []
    this.equations = []
  }

  /*public*/ parse(modelText /*: string*/) /*: Model*/ {
    const parser = createParser(modelText)
    const modelCtx = parser.model()
    modelCtx.accept(this)
    return this.model
  }

  visitModel(ctx) {
    const equationsCtx = ctx.equation()
    if (equationsCtx) {
      const equationReader = new EquationReader()
      for (const equationCtx of equationsCtx) {
        const equation = equationReader.visitEquation(equationCtx)
        this.equations.push(equation)
      }
    }
    this.model = {
      // TODO: Handle subscript ranges
      subscriptRanges: [],
      equations: this.equations
    }
  }
}
