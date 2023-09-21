// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubName } from '../ast/ast-types'

export interface VensimParseContext {
  getDirectSubscripts(
    fileName: string,
    tabOrDelimiter: string,
    firstCell: string,
    lastCell: string,
    prefix: string
  ): SubName[]
}
