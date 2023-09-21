// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Model } from '../../ast/ast-types'
import type { VensimParseContext } from '../vensim-parse-context'

export class ModelReader {
  constructor(parseContext: VensimParseContext)
  parse(input: string): Model
}
