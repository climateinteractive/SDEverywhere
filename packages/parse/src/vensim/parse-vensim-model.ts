// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Equation, Model, SubscriptRange } from '../ast/ast-types'
import { preprocessVensimModel } from './preprocess-vensim'
import type { VensimParseContext } from './vensim-parse-context'
import { ModelReader } from './impl/model-reader'

/**
 * Parse the given Vensim model definition and return a `Model` AST node.
 *
 * @param input A string containing the Vensim model.
 * @param context An object that provides access to file system resources (such as
 * external data files) that are referenced during the parse phase.
 * @param sort Whether to sort definitions alphabetically during the preprocessing phase.
 * @returns A `Model` AST node.
 */
export function parseVensimModel(input: string, context?: VensimParseContext, sort = false): Model {
  const subscriptRanges: SubscriptRange[] = []
  const equations: Equation[] = []

  const defs = preprocessVensimModel(input)
  if (sort) {
    // XXX: This sorting is currently only needed for compatibility with the legacy
    // preprocessor, which sorted definitions alphabetically.  Can consider removing this.
    defs.sort((a, b) => {
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    })
  }

  for (const def of defs) {
    // TODO: Reuse reader instance?
    let parsedModel: Model
    try {
      const modelReader = new ModelReader(context)
      parsedModel = modelReader.parse(def.def)
    } catch (e) {
      console.error(`Failed to parse definition:`)
      console.error(def.def)
      throw e
      // console.error(e)
      // process.exit(1)
    }

    if (parsedModel.subscriptRanges.length > 0) {
      // TODO: Fold in units and comment?
      subscriptRanges.push(...parsedModel.subscriptRanges)
    }

    for (const equation of parsedModel.equations) {
      // Fold in the units and comment strings that were extracted
      // during preprocessing
      equations.push({
        ...equation,
        units: def.units,
        comment: def.comment
      })
    }
  }

  return {
    subscriptRanges,
    equations
  }
}
