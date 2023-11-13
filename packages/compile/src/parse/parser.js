// Copyright (c) 2022 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser } from 'antlr4-vensim'

/**
 * @typedef {object} VensimModelParseTree
 */

/**
 * Create a `ModelParser` for the given model text, which can be the
 * contents of an entire `mdl` file, or a portion of one (e.g., an
 * expression or definition).
 *
 * @param {string} input The string containing the model text.
 * @return {ModelParser} A `ModelParser` from which a parse tree can be obtained.
 */
export function createParser(input) {
  let chars = new antlr4.InputStream(input)
  let lexer = new ModelLexer(chars)
  let tokens = new antlr4.CommonTokenStream(lexer)
  let parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  return parser
}

/**
 * Read the given model text and return a parse tree.
 *
 * @param {string} input The string containing the model text.
 * @return {VensimModelParseTree} A parse tree representation of the model.
 */
export function parseModel(input) {
  let parser = createParser(input)
  return parser.model()
}
