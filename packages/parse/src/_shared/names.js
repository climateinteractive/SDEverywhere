// Copyright (c) 2023 Climate Interactive / New Venture Fund

// XXX: Import this from somewhere else
export function canonicalName(name) {
  // Format a model variable name into a valid C identifier.
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

export function cFunctionName(name) {
  return canonicalName(name).toUpperCase()
}
