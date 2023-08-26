// Copyright (c) 2023 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser, ModelVisitor } from 'antlr4-vensim'

import { canonicalName } from '../../_shared/names'
import { ExprReader } from './expr-reader'

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

export class EquationReader extends ModelVisitor {
  constructor() {
    super()
  }

  /*public*/ parse(equationText /*: string*/) /*: Equation*/ {
    const parser = createParser(equationText)
    const equationCtx = parser.equation()
    return this.visitEquation(equationCtx)
  }

  /*public*/ visitEquation(ctx /*: EquationContext*/) /*: Equation*/ {
    this.equationLhs = undefined

    ctx.lhs().accept(this)

    let equationRhs
    const exprCtx = ctx.expr()
    if (exprCtx) {
      const exprReader = new ExprReader()
      const expr = exprReader.visitExpr(exprCtx)
      equationRhs = {
        kind: 'expr',
        expr
      }
    } else if (ctx.constList()) {
      // TODO: We should parse the const list into individual components, but for now we include
      // the raw text
      // ctx.constList().accept(this)
      equationRhs = {
        kind: 'const-list',
        text: ctx.constList().getText()
      }
    } else if (ctx.lookup()) {
      // TODO
      // ctx.lookup().accept(this)
      equationRhs = {
        kind: 'lookup'
      }
    } else {
      equationRhs = {
        kind: 'data'
      }
    }

    if (this.equationLhs) {
      this.equation = {
        lhs: this.equationLhs,
        rhs: equationRhs,
        // TODO: For now, fill in an empty string for these two; this is mainly
        // for compatibility with unit tests that expect empty string instead of
        // undefined, but this should be revisited
        units: '',
        comment: ''
      }
    }

    return this.equation
  }

  visitSubscriptList(ctx) {
    // Get the subscripts found in the var name
    if (this.subscripts === undefined) {
      // These are the primary subscripts
      this.subscripts = ctx.Id().map(id => id.getText())
    } else {
      // These are subscripts that follow the :EXCEPT: keyword.  Note that there
      // can be more than one set of subscripts following :EXCEPT:, so we need
      // to keep an array
      if (this.exceptSubscriptSets === undefined) {
        this.exceptSubscriptSets = []
      }
      this.exceptSubscriptSets.push(ctx.Id().map(id => id.getText()))
    }
  }

  visitLhs(ctx) {
    // Process the variable name
    const lhsVarName = ctx.Id().getText()
    const lhsVarId = canonicalName(lhsVarName)

    // Process any subscripts that follow the variable name
    super.visitLhs(ctx)
    const subscriptNames = this.subscripts
    const subscriptRefs = subscriptNames?.map(name => {
      return {
        subName: name,
        subId: canonicalName(name)
      }
    })

    // Process additional sets of subscripts that follow the :EXCEPT: keyword
    const exceptSubscriptSets = this.exceptSubscriptSets
    const exceptSubscriptRefSets = exceptSubscriptSets?.map(subscriptSet => {
      return subscriptSet.map(name => {
        return {
          subName: name,
          subId: canonicalName(name)
        }
      })
    })
    this.subscripts = undefined
    this.exceptSubscripts = undefined

    this.equationLhs = {
      varRef: {
        kind: 'variable-ref',
        varName: lhsVarName,
        varId: lhsVarId,
        subscriptRefs,
        exceptSubscriptRefSets
      }
    }
  }
}
