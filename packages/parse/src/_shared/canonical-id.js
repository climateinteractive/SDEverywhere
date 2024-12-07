// Copyright (c) 2023 Climate Interactive / New Venture Fund

// Replace one or more consecutive whitespace or underscore characters with a single underscore
const reWhitespace = new RegExp('(\\s|_)+', 'g')

// Replace each special character in the following set with an underscore
// TODO: We do not currently include '!' characters in this set; we should only replace these
// when they don't appear at the end of a (marked) dimension
const reSpecialChars = new RegExp(`['"\\.,\\-\\$&%\\/\\|]`, 'g')

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
  return '_' + name.trim().replace(reWhitespace, '_').replace(reSpecialChars, '_').toLowerCase()
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
