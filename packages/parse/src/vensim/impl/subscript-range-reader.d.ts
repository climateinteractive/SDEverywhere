// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubscriptRange } from '../../ast/ast-types'
import type { VensimParseContext } from '../vensim-parse-context'

export class SubscriptRangeReader {
  constructor(parseContext: VensimParseContext)
  parse(input: string): SubscriptRange
  visitSubscriptRange(subscriptRangeCtx: unknown): SubscriptRange
}
