// Copyright (c) 2023 Climate Interactive / New Venture Fund

import split from 'split-string'

export interface VensimDef {
  /**
   * The preprocessed equation or subscript range definition (with
   * units and comment replaced with `~~|`).
   */
  def: string
  /** The units text. */
  units: string
  /** The comment text. */
  comment: string
}

/**
 * Process the given Vensim model content so that it can be parsed
 * by `antlr4-vensim`.  This will:
 *   - strip out group markers
 *   - remove everything in the private Vensim sketch section
 *   - join lines that are separated by a continuation (backslash)
 *   - split the input into distinct definitions (equations and
 *     subscript ranges)
 *
 * The definitions are further processed to preserve the units and
 * comment text in separate properties, but strips them from the
 * equation string (replaced with `~~`) to make it easier for
 * `antlr4-vensim` to process.
 *
 * @param input The original Vensim mdl file content.
 * @return An array of preprocessed Vensim definitions.
 */
export function preprocessVensimModel(input: string): VensimDef[] {
  // Split the model into an array of definitions (includes equations,
  // subscript ranges, and groups)
  const rawDefs = splitDefs(input)

  // Keep only equations and subscript range defintions
  const vensimDefs: VensimDef[] = []
  for (const rawDef of rawDefs) {
    if (rawDef.includes('\\---/// Sketch')) {
      // Skip everything starting with the first sketch section
      break
    } else if (rawDef.includes('********************************************************')) {
      // Skip groups
    } else {
      // Process the definition
      const vensimDef = processDef(rawDef)
      if (vensimDef) {
        vensimDefs.push(vensimDef)
      }
    }
  }
  return vensimDefs
}

/**
 * Split a Vensim model string into an array of definitions (including
 * equations, subscript ranges, and groups), without the "|" terminator.
 * This will allow "|" to occur in quoted variable names across line breaks.
 * Backslash characters will be retained.
 */
function splitDefs(input: string): string[] {
  return split(input, { separator: '|', quotes: ['"'], keep: () => true })
}

/**
 * Split a string into separate lines.
 */
function splitLines(input: string): string[] {
  // Windows, Unix, or old Mac line endings
  return input.split(/\r\n|\n|\r/)
}

/**
 * Join lines that are separated by a continuation (backslash) character.
 */
function processBackslashes(input: string): string {
  const inputLines = splitLines(input)

  let output = ''
  let prevLine = ''
  for (let line of inputLines) {
    // Join a previous line with a backslash ending to the current line
    if (prevLine !== '') {
      line = prevLine + line.trim()
      prevLine = ''
    }
    const continuation = line.match(/\\\s*$/)
    if (continuation) {
      // If there is a backslash ending on this line, save it without the backslash
      prevLine = line.substr(0, continuation.index).replace(/\s+$/, ' ')
    } else {
      // There is no continuation on this line, include in output
      output += line + '\n'
    }
  }

  return output
}

/**
 * Match delimiters recursively. Replace delimited strings globally.
 *
 * @param str The string to operate on.
 * @param open The opening delimiter characters.
 * @param close The closing delimiter characters.
 * @param newStr The string to replace delimited substrings with.
 */
function replaceDelimitedStrings(str: string, open: string, close: string, newStr: string): string {
  let result = ''
  let start = 0
  let depth = 0
  const n = str.length
  for (let i = 0; i < n; i++) {
    if (str.charAt(i) === open) {
      if (depth === 0) {
        result += str.substring(start, i)
      }
      depth++
    } else if (str.charAt(i) === close && depth > 0) {
      depth--
      if (depth === 0) {
        result += newStr
        start = i + 1
      }
    }
  }
  if (start < n) {
    result += str.substring(start)
  }
  return result
}

/**
 * Replace all newlines and redundant whitespace into single spaces so
 * that everything is on a single line.
 */
function reduceWhitespace(input: string): string {
  return input.replace(/\s\s+/g, ' ').trim()
}

/**
 * Strip out unnecessary parts of the given raw definition string and
 * return a `VensimDef` containing the processed definition along with
 * the units and comment strings.
 */
function processDef(input: string): VensimDef | undefined {
  // Strip the encoding (included in first def)
  input = input.replace('{UTF-8}', '')

  // Remove ":RAW:" flag; it is not needed by SDE and causes problems if left in
  input = input.replace(/:RAW:/g, '')

  // Remove inline comments
  input = replaceDelimitedStrings(input, '{', '}', '')

  // Remove whitespace
  input = input.trim()

  // Skip empty definitions
  if (input.length === 0) {
    return undefined
  }

  // Join lines that are separated by a continuation (backslash) character
  input = processBackslashes(input)

  // Split on the comment delimiters
  const parts = input.split('~')

  // Rebuild the def with a simple `~~|` ending
  const def = `${reduceWhitespace(parts[0])} ~~|`

  // Extract the units text
  const units = reduceWhitespace(parts[1])

  // Extract the comment text
  // TODO: Preserve newlines in comments?
  const comment = reduceWhitespace(parts[2])

  // TODO: Extract the `:SUPPLEMENTARY:` flags?

  return {
    def,
    units,
    comment
  }

  // TODO: The following creates a key used during flattening; restore this later
  // // Remove newlines so that we look at the full equation as a single line
  // const line = input.replace(/\n/g, ' ').trim()
  // let kind
  // let key = line

  // // Remove everything after the comment delimiters
  // key = key.split('~')[0]

  // // Strip the ":INTERPOLATE:"; it should not be included in the key
  // key = key.replace(/:INTERPOLATE:/g, '')

  // if (key.includes('=')) {
  //   // The line contains an '='; treat this as an equation
  //   kind = 'eqn'
  //   key = key.split('=')[0].trim()
  // } else if (key.includes(':')) {
  //   // The line contains a ':'; treat this as an subscript declaration
  //   kind = 'sub'
  //   key = key.split(':')[0].trim()
  // } else {
  //   // Treat this as a general declaration
  //   kind = 'decl'
  // }

  // // Ignore double quotes
  // key = key.replace(/"/g, '')

  // // Ignore the lookup data if it starts on the first line
  // key = key.split('(')[0]

  // // Ignore any whitespace that remains
  // key = key.trim()

  // // Remove whitespace on the inside of the brackets
  // key = key.replace(/\[\s*/g, '[')
  // key = key.replace(/\s*\]/g, ']')

  // // Ignore case
  // key = key.toLowerCase()

  // unsorted.push({
  //   key,
  //   kind,
  //   originalDecl: eqn
  // })
}
