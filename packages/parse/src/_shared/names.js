// Copyright (c) 2023 Climate Interactive / New Venture Fund

/**
 * Format a model variable name into a valid C identifier (with special characters
 * converted to underscore).
 *
 * @param {string} name The name of the variable in the source model, e.g., "Variable name".
 * @returns {string} The C identifier for the given name, e.g., "_variable_name".
 */
export function canonicalName(name) {
  // TODO: This is also defined in the compile package.  Would be good to
  // define it in one place to reduce the chance of them getting out of sync.
  return (
    '_' +
    name
      .trim()
      .replace(/"/g, '_')
      .replace(/\s+!$/g, '!')
      .replace(/\s/g, '_')
      .replace(/,/g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_')
      .replace(/\$/g, '_')
      .replace(/'/g, '_')
      .replace(/&/g, '_')
      .replace(/%/g, '_')
      .replace(/\//g, '_')
      .replace(/\|/g, '_')
      .toLowerCase()
  )
}

/**
 * Format a model function name into a valid C identifier (with special characters
 * converted to underscore).
 *
 * @param {string} name The name of the variable in the source model, e.g., "FUNCTION NAME".
 * @returns {string} The C identifier for the given name, e.g., "_FUNCTION_NAME".
 */
export function cFunctionName(name) {
  return canonicalName(name).toUpperCase()
}
