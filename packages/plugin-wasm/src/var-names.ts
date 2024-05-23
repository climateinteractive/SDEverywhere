// Copyright (c) 2024 Climate Interactive / New Venture Fund

/**
 * Helper function that converts a Vensim variable or subscript name
 * into a valid C identifier as used by SDE.
 * TODO: Import helper function from `compile` package instead
 */
function sdeNameForVensimName(name: string): string {
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
 * Helper function that converts a Vensim variable name (possibly containing
 * subscripts) into a valid C identifier as used by SDE.
 * TODO: Import helper function from `compile` package instead
 */
export function sdeNameForVensimVarName(varName: string): string {
  const m = varName.match(/([^[]+)(?:\[([^\]]+)\])?/)
  if (!m) {
    throw new Error(`Invalid Vensim name: ${varName}`)
  }
  let id = sdeNameForVensimName(m[1])
  if (m[2]) {
    const subscripts = m[2].split(',').map(x => sdeNameForVensimName(x))
    id += `[${subscripts.join(',')}]`
  }

  return id
}
