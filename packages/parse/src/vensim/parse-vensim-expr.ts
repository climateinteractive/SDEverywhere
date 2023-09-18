// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Expr } from '../ast/ast-types'
import { ExprReader } from './impl/expr-reader'

/**
 * TODO: Docs
 * @param input
 * @returns
 */
export function parseVensimExpr(input: string): Expr {
  // TODO: Reuse reader instance?
  const exprReader = new ExprReader()
  return exprReader.parse(input)
}
