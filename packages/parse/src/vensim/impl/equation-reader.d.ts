// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Equation } from '../../ast/ast-types'

export class EquationReader {
  parse(input: string): Equation
  visitEquation(equationCtx: unknown): Equation
}
