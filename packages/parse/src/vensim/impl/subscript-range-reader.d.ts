// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubscriptRange } from '../../ast/ast-types'

export class SubscriptRangeReader {
  parse(input: string): SubscriptRange
  visitSubscriptRange(subscriptRangeCtx: unknown): SubscriptRange
}
