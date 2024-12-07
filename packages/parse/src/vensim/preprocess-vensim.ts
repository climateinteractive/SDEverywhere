// Copyright (c) 2023 Climate Interactive / New Venture Fund

import split from 'split-string'

/**
 * A single Vensim definition (either a subscript range definition or an
 * equation definition).  This contains the definition's text and metadata
 * that was extracted during preprocessing.
 */
export interface VensimDef {
  /**
   * A simplified key for the LHS of the definition, used for sorting
   * and/or flattening.
   */
  key: string
  /**
   * The preprocessed equation or subscript range definition (with
   * units and comment replaced with `~~|`).
   */
  def: string
  /**
   * The kind of definition; either 'eqn' for an equation containing an equals
   * sign, 'dim' for a dimension (subscript range) definition, or 'decl' for
   * all other declarations (e.g., a lookup or data variable definition).
   */
  kind: 'eqn' | 'dim' | 'decl'
  /**
   * The (1-based) line number where the definition begins.
   */
  line: number
  /**
   * The units text.
   */
  units: string
  /**
   * The comment text.
   */
  comment: string
  /**
   * The optional group name, if the definition is contained within a group.
   */
  group?: string
}

/**
 * Result type for the `preprocessVensimModel` function.
 */
export interface PreprocessedVensimModel {
  /**
   * The preprocessed definitions that were preserved.
   */
  defs: VensimDef[]
  /**
   * The macros that were removed by the preprocessor.
   */
  removedMacros: string[]
  /**
   * The text blocks that were removed by the preprocessor.  These include
   * unsupported functions (such as `TABBED ARRAY`) and other definitions
   * that were requested for removal.
   */
  removedBlocks: string[]
}

/**
 * A raw definition extracted during preprocessing.  This may or may not
 * contain an actual definition (for example, it might contain a section
 * comment).
 */
interface RawDef {
  /**
   * The text of the raw definition.
   */
  text: string
  /**
   * The (1-based) line number where the definition begins.
   */
  line: number
  /**
   * The group in which the definition is contained (can be undefined if
   * the definition is not inside a group).
   */
  group?: string
}

/**
 * Process the given Vensim model content so that it can be parsed
 * by `antlr4-vensim`.  This will:
 *   - strip out group markers
 *   - remove macro definitions, which are currently unsupported
 *   - remove equations that reference certain unsupported functions
 *     (e.g., `TABBED ARRAY`)
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
 * @param options The options that control preprocessing.
 * @return A `PreprocessedVensimModel` instance containing the preprocessed
 * Vensim definitions.
 */
export function preprocessVensimModel(input: string, options?: { removalKeys?: string[] }): PreprocessedVensimModel {
  // Helper function that returns true if the given def should be removed
  const removalKeys = options?.removalKeys
  function shouldRemove(text: string): boolean {
    // Remove definitions that include `TABBED ARRAY`
    if (text.includes('TABBED ARRAY')) {
      return true
    }

    // Remove definitions that include one of the provided removal keys
    if (removalKeys) {
      for (const key of removalKeys) {
        if (text.includes(key)) {
          return true
        }
      }
    }

    // Otherwise, don't remove
    return false
  }

  // Remove macro definitions since they are not currently supported.  We replace
  // the text in the input string with blank lines where the macro definition
  // appeared so that line numbers for definitions that follow are unaffected.
  const macrosResult = removeMacros(input)
  input = macrosResult.processed

  // Split the model into an array of definitions (includes equations,
  // subscript ranges, and groups)
  const rawDefs = splitDefs(input)

  // Keep only equations and subscript range defintions
  const vensimDefs: VensimDef[] = []
  const removedBlocks: string[] = []
  for (const rawDef of rawDefs) {
    // Remove definitions that include `TABBED ARRAY` or one of the requested
    // removal keys
    if (shouldRemove(rawDef.text)) {
      removedBlocks.push(rawDef.text.trim() + '|')
      continue
    }

    // Process the definition
    const vensimDef = processDef(rawDef)
    if (vensimDef) {
      vensimDefs.push(vensimDef)
    }
  }

  return {
    defs: vensimDefs,
    removedMacros: macrosResult.removed,
    removedBlocks: removedBlocks
  }
}

/**
 * Split a Vensim model string into an array of definitions (including
 * equations, subscript ranges, and groups), without the "|" terminator.
 * This will allow "|" to occur in quoted variable names across line breaks.
 * Backslash characters will be retained.
 */
function splitDefs(input: string): RawDef[] {
  // Split the full input string into definitions delineated by the "|" separator.
  // Note that we use the `quotes` option so that the `split` function will not
  // split on "|" characters that appear inside a quoted variable name, for example:
  //   "quoted variable name with | pipe" = 5 ~~|
  const defTexts = split(input, { separator: '|', quotes: ['"'], keep: () => true })

  // Calculate starting line number for each definition by accounting for the
  // number of line breaks in that definition
  const rawDefs = []
  let lineNum = 1
  let currentGroup: string
  for (let defText of defTexts) {
    if (lineNum === 1) {
      // Strip the encoding (included in first def)
      defText = defText.replace('{UTF-8}', '')
    }

    if (defText.includes('\\---/// Sketch')) {
      // Skip everything starting with the first sketch section
      break
    }

    // Split on the first non-whitespace character
    const parts = defText.match(/(\s*)(.*)/ms)

    // Take leading line breaks into account so that we find the line where the
    // actual definition begins
    const leadingLineBreaks = parts[1]?.match(/\r\n|\n|\r/gm)
    lineNum += leadingLineBreaks?.length || 0

    // See if this is a group header
    if (defText.includes('********************************************************')) {
      // This is a group; save the group name
      const groupLines = splitLines(defText).filter(s => s.trim().length > 0)
      currentGroup = undefined
      if (groupLines.length > 1) {
        const groupNameLine = groupLines[1]
        const groupNameParts = groupNameLine.match(/^\s*\.(.*)$/)
        if (groupNameParts) {
          currentGroup = groupNameParts[1]
        }
      }
    } else {
      // This is a regular definition; add it
      rawDefs.push({
        text: defText,
        line: lineNum,
        group: currentGroup
      })
    }

    // Increment by the number of line breaks that appear in the definition content
    const contentLineBreaks = parts[2]?.match(/\r\n|\n|\r/gm)
    lineNum += contentLineBreaks?.length || 0
  }

  return rawDefs
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
 * Create a key from the given definition's LHS that can be used during
 * flattening and/or sorting, and include the kind.
 */
function keyForDef(def: string): { key: string; kind: 'eqn' | 'dim' | 'decl' } {
  // Note: The steps in this function were lifted directly from the legacy
  // preprocessor, mainly so that we would retain compatibility when writing
  // tests that compare the legacy parser to the new one.

  let key = def

  // Strip the ":INTERPOLATE:"; it should not be included in the key
  key = key.replace(/:INTERPOLATE:/g, '')

  let kind: 'eqn' | 'dim' | 'decl'
  if (key.includes('=')) {
    // The line contains an '='; treat this as an equation
    kind = 'eqn'
    key = key.split('=')[0].trim()
  } else if (key.includes(':')) {
    // The line contains a ':'; treat this as a subscript range (dimension)
    kind = 'dim'
    key = key.split(':')[0].trim()
  } else {
    // Treat this as a general declaration
    kind = 'decl'
  }

  // Ignore double quotes
  key = key.replace(/"/g, '')

  // Ignore the lookup data if it starts on the first line
  key = key.split('(')[0]

  // Ignore any whitespace that remains
  key = key.trim()

  // Remove whitespace on the inside of the brackets
  key = key.replace(/\[\s*/g, '[')
  key = key.replace(/\s*\]/g, ']')

  // Ignore case
  key = key.toLowerCase()

  return { key, kind }
}

/**
 * Strip out unnecessary parts of the given raw definition string and
 * return a `VensimDef` containing the processed definition along with
 * the units and comment strings.
 */
function processDef(rawDef: RawDef): VensimDef | undefined {
  let input = rawDef.text

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

  // If the definition is malformed, throw an error
  if (parts.length < 3) {
    throw new Error(`Found invalid model definition during preprocessing (missing comment delimiters?):\n\n${input}`)
  }

  // Get the raw def as a single line
  const rawDefText = reduceWhitespace(parts[0])

  // Create the key
  const { key, kind } = keyForDef(rawDefText)

  // Rebuild the def with a simple `~~|` ending
  const def = `${rawDefText} ~~|`

  // Extract the units text
  const units = reduceWhitespace(parts[1])

  // Extract the comment text
  // TODO: Preserve newlines in comments?
  const comment = reduceWhitespace(parts[2])

  // TODO: Extract the `:SUPPLEMENTARY:` flags?

  // Preserve the group name, if defined
  const group = rawDef.group

  return {
    key,
    def,
    kind,
    line: rawDef.line,
    units,
    comment,
    ...(group ? { group } : {})
  }
}

/**
 * Remove macro definitions from the input string.  We replace the text in the input
 * string with blank lines where the macro definition appeared so that line numbers
 * for definitions that follow are unaffected.
 *
 * @param input The original Vensim mdl file content.
 * @return The processed string and the text blocks that were removed.
 */
function removeMacros(input: string): { processed: string; removed: string[] } {
  // Keep an array of removed strings
  const removed: string[] = []

  // Find all macro definitions
  const processed = input.replace(/:MACRO:.*:END OF MACRO:/gms, match => {
    // Add the removed macro to the array
    removed.push(match)

    // Replace each macro definition with blank lines so that line numbers for
    // definitions that follow are unaffected
    const numBreaks = match.split(/\r\n|\n|\r/gms).length - 1
    return numBreaks > 0 ? '\n'.repeat(numBreaks) : ''
  })

  return {
    processed,
    removed
  }
}
