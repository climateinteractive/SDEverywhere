// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Expr } from '../ast/ast-types'
import { ExprReader } from './impl/expr-reader'

/**
 * Parse the given Vensim expression definition and return an `Expr` AST node.
 *
 * @param input A string containing the Vensim expression.
 * @returns An `Expr` AST node.
 */
export function parseVensimExpr(input: string): Expr {
  // TODO: Reuse reader instance?
  const exprReader = new ExprReader()
  return exprReader.parse(input)
}
