// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { ModelVisitor } from 'antlr4-vensim'

import { canonicalName } from '../../_shared/names'

import { createAntlrParser } from './antlr-parser'
import { ExprReader } from './expr-reader'

export class EquationReader extends ModelVisitor {
  constructor() {
    super()
  }

  /*public*/ parse(equationText /*: string*/) /*: Equation*/ {
    const parser = createAntlrParser(equationText)
    const equationCtx = parser.equation()
    return this.visitEquation(equationCtx)
  }

  /*public*/ visitEquation(ctx /*: EquationContext*/) /*: Equation*/ {
    this.equationLhs = undefined
    this.lookupDef = undefined

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
      ctx.constList().accept(this)
      equationRhs = {
        kind: 'const-list',
        constants: this.constants,
        text: this.constListText
      }
    } else if (ctx.lookup()) {
      ctx.lookup().accept(this)
      equationRhs = {
        kind: 'lookup',
        lookupDef: this.lookupDef
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

  //
  // CONST LISTS
  //

  visitConstList(ctx) {
    // TODO: It would be better if resolved to a `NumberValue[][]` (one array per dimension) to
    // better match how it appears in a model, but the antlr4-vensim grammar currently flattens
    // them into a single list (it doesn't make use of the semicolon separator), so we have to
    // do the same for now
    this.constants = ctx.expr().map(expr => {
      const text = expr.getText()
      const value = parseFloat(text)
      return {
        kind: 'number',
        value,
        text
      }
    })
    this.constListText = ctx.getText()
  }

  //
  // LOOKUPS
  //

  getPoint(lookupPoint) {
    const exprs = lookupPoint.expr()
    if (exprs.length >= 2) {
      return [parseFloat(exprs[0].getText()), parseFloat(exprs[1].getText())]
    }
  }

  visitLookup(ctx) {
    this.lookupRange = undefined
    this.lookupPoints = undefined

    if (ctx.lookupRange()) {
      ctx.lookupRange().accept(this)
    }
    if (ctx.lookupPointList()) {
      ctx.lookupPointList().accept(this)
    }

    let range
    if (this.lookupRange && this.lookupRange.length === 2) {
      range = {
        min: this.lookupRange[0],
        max: this.lookupRange[1]
      }
    }
    this.lookupDef = {
      kind: 'lookup-def',
      range,
      points: this.lookupPoints
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
}
