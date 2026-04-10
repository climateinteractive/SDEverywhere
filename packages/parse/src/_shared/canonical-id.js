// Copyright (c) 2023 Climate Interactive / New Venture Fund

// Detect '!' at the end of a marked dimension when preceded by whitespace
const reTrailingMark = new RegExp('\\s+!$', 'g')

// Detect one or more consecutive whitespace or underscore characters
const reWhitespace = new RegExp('(\\s|_)+', 'g')

// Detect characters that are not valid in C/JS identifiers.  This matches anything
// that is not a Unicode letter (\p{L}), Unicode digit (\p{N}), underscore,
// or '!' (which is preserved for dimension marks).
// TODO: Note that this means that we don't currently replace '!' characters that
// appear within a variable or dimension name.  We should replace these with underscore
// (like we do for other special characters) except in the case where they appear at
// the end of the dimension name to indicate a marked dimension.
const reSpecialChars = /[^\p{L}\p{N}_!]/gu

/**
 * Format a model variable or subscript/dimension name into a valid C identifier (with
 * special characters converted to underscore).
 *
 * Note that this should only be called with an individual variable base name (e.g.,
 * 'Variable name') or a subscript/dimension name (e.g., 'DimA').  In the case where
 * you have a full variable name that includes subscripts/dimensions (e.g.,
 * 'Variable name[DimA,B2]'), use `canonicalVarId` to convert the base variable name
 * and subscript/dimension parts to canonical form indepdendently.
 *
 * @param {string} name The name of the variable in the source model, e.g., "Variable name".
 * @returns {string} The C identifier for the given name, e.g., "_variable_name".
 */
export function canonicalId(name) {
  return (
    '_' +
    name
      // Ignore any leading or trailing whitespace
      .trim()
      // When a '!' character appears at the end of a marked dimension, preserve the mark
      // but remove any preceding whitespace
      .replace(reTrailingMark, '!')
      // Replace one or more consecutive whitespace or underscore characters with a single
      // underscore character; this matches the behavior of Vensim documented here:
      //   https://www.vensim.com/documentation/ref_variable_names.html
      .replace(reWhitespace, '_')
      // Replace any characters that are not valid in C/JS identifiers with an underscore
      // (preserving Unicode letters/digits and the '!' mark for dimensions)
      .replace(reSpecialChars, '_')
      // Convert to lower case
      .toLowerCase()
  )
}

/**
 * Format a (subscripted or non-subscripted) model variable name into a canonical identifier,
 * (with special characters converted to underscore, and subscript/dimension parts separated
 * by commas).
 *
 * @param {string} name The name of the variable in the source model, e.g., "Variable name[DimA, B2]".
 * @returns {string} The canonical identifier for the given name, e.g., "_variable_name[_dima,_b2]".
 */
export function canonicalVarId(name) {
  const m = name.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (!m) {
    throw new Error(`Invalid variable name: ${name}`)
  }

  let id = canonicalId(m[1])
  if (m[2]) {
    const subscripts = m[2].split(',').map(x => canonicalId(x))
    id += `[${subscripts.join(',')}]`
  }

  return id
}

/**
 * Format a model function name into a valid C identifier (with special characters
 * converted to underscore, and the ID converted to uppercase).
 *
 * @param {string} name The name of the variable in the source model, e.g., "FUNCTION name".
 * @returns {string} The C identifier for the given name, e.g., "_FUNCTION_NAME".
 */
export function canonicalFunctionId(name) {
  return canonicalId(name).toUpperCase()
}
