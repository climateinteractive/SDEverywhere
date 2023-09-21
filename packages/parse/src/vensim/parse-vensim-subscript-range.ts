// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubscriptRange } from '../ast/ast-types'
import type { VensimParseContext } from './vensim-parse-context'
import { SubscriptRangeReader } from './impl/subscript-range-reader'

/**
 * TODO: Docs
 *
 * @param input
 * @param context
 * @returns
 */
export function parseVensimSubscriptRange(input: string, context?: VensimParseContext): SubscriptRange {
  // TODO: Reuse reader instance?
  const subscriptReader = new SubscriptRangeReader(context)
  return subscriptReader.parse(input)
}
