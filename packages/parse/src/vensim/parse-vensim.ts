// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Equation, Expr, Model, SubscriptRange } from '../ast/ast-types'

import { ExprReader } from './impl/expr-reader'
import { EquationReader } from './impl/equation-reader'
import { ModelReader } from './impl/model-reader'

import { preprocessVensimModel } from './preprocess-vensim'

export function parseVensimExpr(input: string): Expr {
  // TODO: Reuse reader instance?
  const exprReader = new ExprReader()
  return exprReader.parse(input)
}

export function parseVensimEquation(input: string): Equation {
  // TODO: Reuse reader instance?
  const equationReader = new EquationReader()
  return equationReader.parse(input)
}

export function parseVensimModel(input: string): Model {
  const subscriptRanges: SubscriptRange[] = []
  const equations: Equation[] = []

  // TODO: For now, use a model parser on each definition, and
  // then use the result to see if it was an equation or subscript def
  const defs = preprocessVensimModel(input)
  for (const def of defs) {
    // TODO: Reuse reader instance?
    let parsedModel: Model
    try {
      const modelReader = new ModelReader()
      parsedModel = modelReader.parse(def.def)
    } catch (e) {
      console.error(`Failed to parse definition:`)
      console.error(def.def)
      throw e
      // console.error(e)
      // process.exit(1)
    }

    if (parsedModel.subscriptRanges.length > 0) {
      // TODO: Fold in units and comment?
      subscriptRanges.push(...parsedModel.subscriptRanges)
    }
    for (const equation of parsedModel.equations) {
      // Fold in the units and comment strings that were extracted
      // during preprocessing
      equations.push({
        ...equation,
        units: def.units,
        comment: def.comment
      })
    }
  }

  return {
    subscriptRanges,
    equations
  }
}
