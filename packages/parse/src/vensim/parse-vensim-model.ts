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

  // Run the preprocessor on the input (to separate out units, comments, unsupported
  // sections, etc) so that it can be parsed more easily by `antlr4-vensim`.
  const defs = preprocessVensimModel(input)
  if (sort) {
    // XXX: This sorting is currently only needed for compatibility with the legacy
    // preprocessor, which sorted definitions alphabetically.  Can consider removing this.
    defs.sort((a, b) => {
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    })
  }

  // Parse each subscript range or equation definition
  for (const def of defs) {
    // TODO: Reuse reader instance?
    let parsedModel: Model
    try {
      const modelReader = new ModelReader(context)
      parsedModel = modelReader.parse(def.def)
    } catch (e) {
      // Include context such as line/column numbers in the error message if available
      let linePart = ''
      if (e.cause?.code === 'VensimParseError') {
        if (e.cause.line) {
          // The line number reported by ANTLR is relative to the beginning of the
          // preprocessed definition (since we parse each definition individually),
          // so we need to add it to the line of the definition in the original source
          linePart += ` at line ${e.cause.line - 1 + def.line}`
          if (e.cause.column) {
            linePart += `, col ${e.cause.column}`
          }
        }
      }
      const msg = `Failed to parse Vensim model definition${linePart}:\n${def.def}\n\nDetail:\n  ${e.message}`
      throw new Error(msg)
    }

    for (const subscriptRange of parsedModel.subscriptRanges) {
      // Fold in the comment string that was extracted during preprocessing
      subscriptRanges.push({
        ...subscriptRange,
        comment: def.comment
      })
    }

    for (const equation of parsedModel.equations) {
      // Fold in the units and comment strings that were extracted during preprocessing
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
