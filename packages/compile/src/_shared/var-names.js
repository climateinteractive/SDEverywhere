import { canonicalName } from './helpers.js'
import { isIndex, sub } from './subscript.js'

/**
 * Convert a Vensim variable name to a C name.
 *
 * WARNING: This function requires model analysis to be completed first when the variable
 * has subscripts.
 *
 * @param {string} vensimVarName The full Vensim variable name (can contain subscripts).
 * @returns {string} A canonical C representation of the variable name (e.g., '_variable_name').
 */
export function cName(vensimVarName) {
  // Split the variable name from the subscripts
  let matches = vensimVarName.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (!matches) {
    throw new Error(`Invalid variable name '${vensimVarName}' found when converting to C representation`)
  }
  let cVarName = canonicalName(matches[1])
  if (matches[2]) {
    // The variable name includes subscripts, so split them into individual IDs
    let cSubIds = matches[2].split(',').map(x => canonicalName(x))
    // If a subscript is an index, convert it to an index number to match Vensim data exports
    let cSubIdParts = cSubIds.map(cSubId => {
      return isIndex(cSubId) ? `[${sub(cSubId).value}]` : `[${cSubId}]`
    })
    // Append the subscript parts to the base variable name to create the full reference
    cVarName += cSubIdParts.join('')
  }
  return cVarName
}
