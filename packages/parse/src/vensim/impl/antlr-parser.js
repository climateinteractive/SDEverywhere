// Copyright (c) 2023 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser } from 'antlr4-vensim'

/**
 * Create a `ModelParser` for the given model text, which can be the
 * contents of an entire `mdl` file, or a portion of one (e.g., an
 * expression or definition).
 *
 * @param {string} input The string containing the model text.
 * @return {ModelParser} A `ModelParser` from which a parse tree can be obtained.
 */
export function createAntlrParser(input) {
  // Create a custom error handler that will override the defafult one, which
  // only logs errors to stderr.  The custom handler will rethrow the error (for
  // fail-fast behavior).
  const errorListener = new CustomErrorListener(input)

  // Create a lexer for the input (with custom error handler)
  let chars = new antlr4.InputStream(input)
  let lexer = new ModelLexer(chars)
  lexer.removeErrorListeners()
  lexer.addErrorListener(errorListener)

  // Create a parser around the result of the lexer (with custom error handler)
  // error listener.
  let tokens = new antlr4.CommonTokenStream(lexer)
  let parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  parser.removeErrorListeners()
  parser.addErrorListener(errorListener)

  return parser
}

class CustomErrorListener extends antlr4.error.ErrorListener {
  constructor(input) {
    super()
    this.input = input
  }

  syntaxError(_recognizer, _offendingSymbol, line, column, msg /*, err*/) {
    throw new Error(msg, {
      cause: {
        code: 'VensimParseError',
        line,
        column
      }
    })
  }
}
