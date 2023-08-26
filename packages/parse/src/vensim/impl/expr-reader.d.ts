// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Expr } from '../../ast/ast-types'

export class ExprReader {
  parse(input: string): Expr
  visitExpr(exprCtx: unknown): Expr
}
