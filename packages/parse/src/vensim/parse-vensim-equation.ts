// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Equation } from '../ast/ast-types'
import { EquationReader } from './impl/equation-reader'

/**
 * TODO: Docs
 * @param input
 * @returns
 */
export function parseVensimEquation(input: string): Equation {
  // TODO: Reuse reader instance?
  const equationReader = new EquationReader()
  return equationReader.parse(input)
}
