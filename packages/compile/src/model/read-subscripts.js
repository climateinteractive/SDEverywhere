import XLSX from 'xlsx'

import { readCsv } from '../_shared/helpers.js'
import { Subscript } from '../_shared/subscript.js'

/**
 * TODO: Docs
 *
 * @param {*} parsedModel TODO: Use ParsedVensimModel type here
 */
export function readSubscripts(parsedModel) {
  // Read and process all subscript range definitions from the parsed model
  for (const subscriptRange of parsedModel.root.subscriptRanges) {
    const dimName = subscriptRange.dimName
    const familyName = subscriptRange.familyName
    if (subscriptRange.subscriptRefs.length > 0) {
      // This is a normal subscript range definition
      const subNames = subscriptRange.subscriptRefs.map(ref => ref.subName)
      const mappings = subscriptRange.subscriptMappings.map(mapping => {
        // Convert from the AST representation (`SubscriptMapping`) to the structure used
        // by the compiler
        return {
          toDim: mapping.toDimName,
          value: mapping.subscriptRefs.map(ref => ref.subName)
        }
      })
      Subscript(dimName, subNames, familyName, mappings)
    } else {
      // This is an alias (for example, `DimA <-> DimB`)
      // XXX: The legacy Vensim parser set `modelValue` to an empty string (instead of an
      // empty array) in the case of a `<->` alias, so we will do the same here for now.
      // Once we remove the legacy parsing code we could fix the tests to expect an empty
      // array instead of empty string.
      Subscript(dimName, '', familyName, [])
    }
  }
}

/**
 * Read the subscripts for a `GET DIRECT SUBSCRIPT` call in a subscript range definition.
 *
 * @param {string} filePath The absolute
 * @param {string} tabOrDelimiter
 * @param {string} firstCell The name of the first cell.
 * @param {string} lastCell The name of the last cell.
 */
export function getDirectSubscripts(fileName, tabOrDelimiter, firstCell, lastCell) {
  // If lastCell is a column letter, scan the column, else scan the row
  const dataAddress = XLSX.utils.decode_cell(firstCell.toUpperCase())
  let col = dataAddress.c
  let row = dataAddress.r
  if (col < 0 || row < 0) {
    throw new Error(`Failed to parse 'firstcell' argument for GET DIRECT SUBSCRIPT call: ${firstCell}`)
  }
  let nextCell
  if (isNaN(parseInt(lastCell))) {
    nextCell = () => row++
  } else {
    nextCell = () => col++
  }

  // Read subscript names from the CSV file at the given position
  // TODO: We currently only support reading from CSV files, but Vensim also allows for
  // Excel files for `GET DIRECT SUBSCRIPT`, so we should add support for those here
  const data = readCsv(fileName, tabOrDelimiter)
  const subNames = []
  if (data) {
    let subName = data[row][col]
    while (subName != null) {
      subNames.push(subName)
      nextCell()
      subName = data[row] != null ? data[row][col] : null
    }
  }

  return subNames
}
