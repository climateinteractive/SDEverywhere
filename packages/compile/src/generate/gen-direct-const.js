import path from 'node:path'

import XLSX from 'xlsx'

import { cartesianProductOf, cdbl, readCsv } from '../_shared/helpers.js'
import { indexInSepDim, isDimension, sub } from '../_shared/subscript.js'

/**
 * Generate code for a variable that uses `GET DIRECT CONSTANTS` to source constant values from an external
 * file (in CSV or Excel format).
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {string} modelDir The path to the directory containing the model (used for resolving data files).
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateDirectConstInit(variable, modelDir) {
  // Map zero, one, or two subscripts on the LHS in model order to a table of numbers in a CSV file.
  // The subscripts may be indices to pick out a subset of the data.
  let { file, tab, startCell } = variable.directConstArgs
  let csvPathname = path.resolve(modelDir, file)
  let data = readCsv(csvPathname, tab)
  if (!data) {
    return []
  }

  let getCellValue = (c, r) => {
    let value = '0.0'
    try {
      value = data[r] != null && data[r][c] != null ? cdbl(data[r][c]) : null
    } catch (error) {
      console.error(`${error.message} in ${csvPathname}`)
    }
    return value
  }

  // Get C subscripts in text form for the LHS in normal order.
  let lhsSubIds = variable.parsedEqn.lhs.varRef.subscriptRefs?.map(s => s.subId) || []
  let modelDimNames = lhsSubIds.filter(s => isDimension(s))

  // Generate offsets from the start cell in the table corresponding to LHS indices.
  let cellOffsets = []
  let cSubscripts = variable.subscripts.map(s => (isDimension(s) ? sub(s).value : [s]))
  let lhsIndexSubscripts = cartesianProductOf(cSubscripts)

  // Find the table cell offset for each LHS index tuple.
  let lines = []
  for (let indexSubscripts of lhsIndexSubscripts) {
    let entry = [null, null]
    for (let i = 0; i < variable.subscripts.length; i++) {
      // LHS dimensions or indices in a separated dimension map to table cells.
      let lhsSubscript = variable.subscripts[i]
      if (isDimension(lhsSubscript) || indexInSepDim(lhsSubscript, variable)) {
        // Consider the LHS index subscript at this position.
        let indexSubscript = indexSubscripts[i]
        let ind = sub(indexSubscript)
        // Find the model subscript position corresponding to the LHS index subscript.
        for (let iModelDim = 0; iModelDim < modelDimNames.length; iModelDim++) {
          // Only fill an entry position once.
          if (entry[iModelDim] === null) {
            let modelDim = sub(modelDimNames[iModelDim])
            if (modelDim.family === ind.family) {
              // Set the numeric index for the model dimension in the cell offset entry.
              // Use the position within the dimension to map subdimensions onto cell offsets.
              let pos = modelDim.value.indexOf(indexSubscript)
              // Vectors use a 2D cell offset that maps to columns in the first row.
              // Tables use a 2D cell offset with the row or column matching the model dimension.
              let entryRowOrCol = modelDimNames.length > 1 ? iModelDim : 1
              entry[entryRowOrCol] = pos
              break
            }
          }
        }
      }
    }
    // Replace unfilled entry positions with zero.
    entry = entry.map(x => (x === null ? 0 : x))
    // Read values by column first when the start cell ends with an asterisk.
    // Ref: https://www.vensim.com/documentation/fn_get_direct_constants.html
    if (startCell.endsWith('*')) {
      entry.reverse()
    }
    cellOffsets.push(entry)
  }

  // Read CSV data into an indexed variable for each cell.
  let numericSubscripts = lhsIndexSubscripts.map(idx => idx.map(s => sub(s).value))
  let lhsSubscripts = numericSubscripts.map(s => s.reduce((a, v) => a.concat(`[${v}]`), ''))
  let dataAddress = XLSX.utils.decode_cell(startCell)
  let startCol = dataAddress.c
  let startRow = dataAddress.r
  for (let i = 0; i < cellOffsets.length; i++) {
    let rowOffset = cellOffsets[i][0] ? cellOffsets[i][0] : 0
    let colOffset = cellOffsets[i][1] ? cellOffsets[i][1] : 0
    let dataValue = getCellValue(startCol + colOffset, startRow + rowOffset)
    let lhs = `${variable.varName}${lhsSubscripts[i] || ''}`
    lines.push(`  ${lhs} = ${dataValue};`)
  }

  return lines
}
