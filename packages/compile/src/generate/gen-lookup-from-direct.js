import * as R from 'ramda'
import XLSX from 'xlsx'

import { listConcat } from '../_shared/helpers.js'
import { sub } from '../_shared/subscript.js'

import { handleExcelOrCsvFile } from './direct-data-helpers.js'

/**
 * Generate code for a variable that uses `GET DIRECT DATA` to source data from an external file
 * (in CSV or Excel format).
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {Map<string, any>} directData The mapping of dataset name used in a `GET DIRECT DATA` call (e.g.,
 * `?data`) to the tabular data contained in the loaded data file.
 * @param {string} modelDir The path to the directory containing the model (used for resolving data files).
 * @param {string} varLhs The C/JS code for the LHS variable reference.
 * @param {'c' | 'js'} outFormat The output format.
 * @return {string[]} An array of strings containing the generated C/JS code for the variable,
 * one string per line of code.
 */
export function generateLookupsFromDirectData(variable, mode, directData, modelDir, varLhs, outFormat) {
  if (mode === 'decl') {
    // Nothing to emit in decl mode
    return []
  } else if (mode !== 'init-lookups') {
    throw new Error(`Invalid code gen mode '${mode}' for data variable ${variable.modelLHS}`)
  }

  // Create a function that reads the CSV or XLS[X] content
  const { file, tab, timeRowOrCol, startCell } = variable.directDataArgs
  const getCellValue = handleExcelOrCsvFile(file, tab, 'data', directData, modelDir)

  // If direct data exists for this variable, copy it from the workbook into one or more lookups
  let indexNum = 0
  if (!R.isEmpty(variable.separationDims)) {
    // Generate a lookup for a separated index in the variable's dimension.
    if (variable.separationDims.length > 1) {
      console.error(`WARNING: direct data variable ${variable.varName} separated on more than one dimension`)
    }
    let dimName = variable.separationDims[0]
    for (let subscript of variable.subscripts) {
      if (sub(subscript).family === dimName) {
        // Use the index value in the subscript family when that is the separation dimension.
        indexNum = sub(subscript).value
        break
      }
      if (sub(dimName).value.includes(subscript)) {
        // Look up the index when the separation dimension is a subdimension.
        indexNum = sub(dimName).value.indexOf(subscript)
        break
      }
    }
  }
  return [generateDirectDataLookup(varLhs, getCellValue, timeRowOrCol, startCell, indexNum, outFormat)]
}

function generateDirectDataLookup(varLhs, getCellValue, timeRowOrCol, startCell, indexNum, outFormat) {
  // Read a row or column of data as (time, value) pairs from the worksheet.
  // The cell(c,r) function wraps data access by column and row.
  let lookupData = ''
  let lookupSize = 0
  let dataAddress = XLSX.utils.decode_cell(startCell.toUpperCase())
  let dataCol = dataAddress.c
  let dataRow = dataAddress.r
  if (dataCol < 0 || dataRow < 0) {
    throw new Error(`Failed to parse 'cell' argument for GET DIRECT {DATA,LOOKUPS} call for ${varLhs}: ${startCell}`)
  }

  let timeCol, timeRow, nextCell
  if (isNaN(parseInt(timeRowOrCol))) {
    // Time values are in a column.
    timeCol = XLSX.utils.decode_col(timeRowOrCol.toUpperCase())
    timeRow = dataRow
    dataCol += indexNum
    nextCell = () => {
      dataRow++
      timeRow++
    }
  } else {
    // Time values are in a row.
    timeCol = dataCol
    timeRow = XLSX.utils.decode_row(timeRowOrCol)
    dataRow += indexNum
    nextCell = () => {
      dataCol++
      timeCol++
    }
  }

  let timeValue = getCellValue(timeCol, timeRow)
  let dataValue = getCellValue(dataCol, dataRow)
  while (timeValue != null && dataValue != null) {
    lookupData = listConcat(lookupData, `${timeValue}, ${dataValue}`, true)
    lookupSize++
    nextCell()
    dataValue = getCellValue(dataCol, dataRow)
    timeValue = getCellValue(timeCol, timeRow)
  }
  if (lookupSize === 0) {
    throw new Error(`Empty lookup data array for ${varLhs}`)
  }

  switch (outFormat) {
    case 'c':
      return `  ${varLhs} = __new_lookup(${lookupSize}, /*copy=*/true, (double[]){ ${lookupData} });`
    case 'js':
      return `  ${varLhs} = fns.createLookup(${lookupSize}, [${lookupData}]);`
    default:
      throw new Error(`Unhandled output format '${outFormat}'`)
  }
}
