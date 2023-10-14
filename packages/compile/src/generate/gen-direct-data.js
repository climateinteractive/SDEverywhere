import path from 'node:path'

import * as R from 'ramda'
import XLSX from 'xlsx'

import { cdbl, listConcat, readCsv } from '../_shared/helpers.js'
import { sub } from '../_shared/subscript.js'

/**
 * Generate code for a variable that uses `GET DIRECT DATA` to source data from an external file
 * (in CSV or Excel format).
 *
 * @param {*} variable The `Variable` instance to process.
 * @param {'decl' | 'init-lookups'} mode The code generation mode.
 * @param {Map<string, any>} directData The mapping of dataset name used in a `GET DIRECT DATA` call (e.g.,
 * `?data`) to the tabular data contained in the loaded data file.
 * @param {string} modelDir The path to the directory containing the model (used for resolving data files).
 * @param {string} varLhs The C code for the LHS variable reference.
 * @return {string[]} An array of strings containing the generated C code for the variable,
 * one string per line of code.
 */
export function generateDirectDataInit(variable, mode, directData, modelDir, varLhs) {
  // If direct data exists for this variable, copy it from the workbook into one or more lookups.
  let lines = []

  if (mode === 'init-lookups') {
    let getCellValue
    let { file, tab, timeRowOrCol, startCell } = variable.directDataArgs
    if (file.startsWith('?')) {
      // The file is a tag for an Excel file with data in the directData map.
      let workbook = directData.get(file)
      if (workbook) {
        let sheet = workbook.Sheets[tab]
        if (sheet) {
          getCellValue = (c, r) => {
            let cell = sheet[XLSX.utils.encode_cell({ c, r })]
            return cell != null ? cdbl(cell.v) : null
          }
        } else {
          throw new Error(`ERROR: Direct data worksheet ${tab} tagged ${file} not found`)
        }
      } else {
        throw new Error(`ERROR: Direct data workbook tagged ${file} not found`)
      }
    } else {
      // The file is a CSV pathname. Read it now.
      let csvPathname = path.resolve(modelDir, file)
      let data = readCsv(csvPathname, tab)
      if (data) {
        getCellValue = (c, r) => {
          let value = '0.0'
          try {
            value = data[r] != null && data[r][c] != null ? cdbl(data[r][c]) : null
          } catch (error) {
            console.error(`${error.message} in ${csvPathname}`)
          }
          return value
        }
      }
    }

    // If the data was found, convert it to a lookup.
    if (getCellValue) {
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
      lines.push(generateDirectDataLookup(varLhs, getCellValue, timeRowOrCol, startCell, indexNum))
    }
  }

  return lines
}

function generateDirectDataLookup(varLhs, getCellValue, timeRowOrCol, startCell, indexNum) {
  // Read a row or column of data as (time, value) pairs from the worksheet.
  // The cell(c,r) function wraps data access by column and row.
  let lookupData = ''
  let lookupSize = 0
  let dataAddress = XLSX.utils.decode_cell(startCell)
  let dataCol = dataAddress.c
  let dataRow = dataAddress.r

  let timeCol, timeRow, nextCell
  if (isNaN(parseInt(timeRowOrCol))) {
    // Time values are in a column.
    timeCol = XLSX.utils.decode_col(timeRowOrCol)
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
  if (lookupSize < 1) {
    throw new Error(`ERROR: lookup size = ${lookupSize} in ${varLhs}`)
  }

  return `  ${varLhs} = __new_lookup(${lookupSize}, /*copy=*/true, (double[]){ ${lookupData} });`
}
