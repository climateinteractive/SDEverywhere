// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Equation } from '../ast/ast-types'
import { EquationReader } from './impl/equation-reader'

/**
 * Parse the given Vensim equation definition and return an `Equation` AST node.
 *
 * @param input A string containing the Vensim equation definition.
 * @returns An `Equation` AST node.
 */
export function parseVensimEquation(input: string): Equation {
  // TODO: Reuse reader instance?
  const equationReader = new EquationReader()
  return equationReader.parse(input)
}
