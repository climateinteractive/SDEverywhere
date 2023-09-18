// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubscriptRange } from '../ast/ast-types'
import { SubscriptRangeReader } from './impl/subscript-range-reader'

/**
 * TODO: Docs
 * @param input
 * @returns
 */
export function parseVensimSubscriptRange(input: string): SubscriptRange {
  // TODO: Reuse reader instance?
  const subscriptReader = new SubscriptRangeReader()
  return subscriptReader.parse(input)
}
