// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { DimensionDef } from '../ast/ast-types'
import type { VensimParseContext } from './vensim-parse-context'
import { SubscriptRangeReader } from './impl/subscript-range-reader'

/**
 * Parse the given Vensim subscript range definition and return a `DimensionDef` AST node.
 *
 * @param input A string containing the Vensim subscript range definition.
 * @param context An object that provides access to file system resources (such as
 * external data files) that are referenced during the parse phase.
 * @returns A `DimensionDef` AST node.
 */
export function parseVensimSubscriptRange(input: string, context?: VensimParseContext): DimensionDef {
  // TODO: Reuse reader instance?
  const subscriptReader = new SubscriptRangeReader(context)
  return subscriptReader.parse(input)
}
