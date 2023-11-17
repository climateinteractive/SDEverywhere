// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { ModelVisitor } from 'antlr4-vensim'

import { createAntlrParser } from './antlr-parser'
import { EquationReader } from './equation-reader'
import { SubscriptRangeReader } from './subscript-range-reader'

export class ModelReader extends ModelVisitor {
  constructor(parseContext /*: VensimParseContext*/) {
    super()
    this.parseContext = parseContext
    this.subscriptRanges = []
    this.equations = []
  }

  /*public*/ parse(modelText /*: string*/) /*: Model*/ {
    const parser = createAntlrParser(modelText)
    const modelCtx = parser.model()
    modelCtx.accept(this)
    return this.model
  }

  visitModel(ctx) {
    const subscriptRangesCtx = ctx.subscriptRange()
    if (subscriptRangesCtx) {
      // TODO: Can we reuse reader instances?
      const subscriptReader = new SubscriptRangeReader(this.parseContext)
      for (const subscriptRangeCtx of subscriptRangesCtx) {
        const subscriptRange = subscriptReader.visitSubscriptRange(subscriptRangeCtx)
        this.subscriptRanges.push(subscriptRange)
      }
    }

    const equationsCtx = ctx.equation()
    if (equationsCtx) {
      // TODO: Can we reuse reader instances?
      const equationReader = new EquationReader()
      for (const equationCtx of equationsCtx) {
        const equation = equationReader.visitEquation(equationCtx)
        this.equations.push(equation)
      }
    }

    this.model = {
      subscriptRanges: this.subscriptRanges,
      equations: this.equations
    }
  }
}
