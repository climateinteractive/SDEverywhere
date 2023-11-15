import path from 'node:path'

import XLSX from 'xlsx'

import { cdbl, readCsv, readXlsx } from '../_shared/helpers.js'

/**
 * Return a `getCellValue` function that reads the CSV or XLS[X] content.
 *
 * @param {string} fileOrTag The filename (e.g., 'data.xlsx') or tag name (e.g., '?data').
 * @param {string} tabOrDelimiter
 * @param {'data' | 'constants'} dataKind The kind of `GET DIRECT ...` being used.
 * @param {Map<string, any>} directData The mapping of dataset name used in a `GET DIRECT DATA` call (e.g.,
 * `?data`) to the tabular data contained in the loaded data file.
 * @param {string} modelDir The path to the directory containing the model (used for resolving data files).
 * @returns A `getCellValue` function.
 */
export function handleExcelOrCsvFile(fileOrTag, tabOrDelimiter, dataKind, directData, modelDir) {
  if (fileOrTag.startsWith('?')) {
    // The file is a tag for an Excel file with data in the directData map.
    const workbook = directData.get(fileOrTag)
    return handleExcelWorkbook(fileOrTag, workbook, tabOrDelimiter, dataKind, 'tagged')
  } else {
    // The file is a CSV or XLS[X] pathname. Read it now.
    const dataPathname = path.resolve(modelDir, fileOrTag)
    if (dataPathname.toLowerCase().endsWith('csv')) {
      return handleCsvFile(fileOrTag, dataPathname, tabOrDelimiter, dataKind)
    } else {
      const workbook = readXlsx(dataPathname)
      return handleExcelWorkbook(fileOrTag, workbook, tabOrDelimiter, dataKind, 'file')
    }
  }
}

/**
 * Return a `getCellValue` function for the given Excel workbook parsed from an XLS[X] file.
 *
 * @param {string} fileOrTag The filename (e.g., 'data.xlsx') or tag name (e.g., '?data').
 * @param {*} workbook The workbook data loaded from the file.
 * @param {string} tab The name of the tab within the workbook.
 * @param {'data' | 'constants'} dataKind The kind of `GET DIRECT ...` being used.
 * @param {'file' | 'tagged'} dataSource The reference kind, either 'file' or 'tagged'.
 * @returns A `getCellValue` function.
 */
function handleExcelWorkbook(fileOrTag, workbook, tab, dataKind, dataSource) {
  if (workbook) {
    let sheet = workbook.Sheets[tab]
    if (sheet) {
      return (c, r) => {
        let cell = sheet[XLSX.utils.encode_cell({ c, r })]
        return cell != null ? cdbl(cell.v) : null
      }
    } else {
      throw new Error(`Direct ${dataKind} worksheet ${tab} in ${dataSource} ${fileOrTag} not found`)
    }
  } else {
    throw new Error(`Direct ${dataKind} workbook ${dataSource} ${fileOrTag} not found`)
  }
}

/**
 * Return a `getCellValue` function for the given CSV file.
 *
 * @param {string} file The filename of the data file.
 * @param {string} dataFilename The full path to the data file.
 * @param {string} delimiter The delimiter for the tabular data.
 * @param {'data' | 'constants'} dataKind The kind of `GET DIRECT ...` being used.
 * @returns A `getCellValue` function.
 */
function handleCsvFile(file, dataPathname, delimiter, dataKind) {
  // Return a `getCellValue` function for the given CSV file.
  let data = readCsv(dataPathname, delimiter)
  if (data) {
    return (c, r) => {
      let value = '0.0'
      try {
        value = data[r] != null && data[r][c] != null ? cdbl(data[r][c]) : null
      } catch (error) {
        console.error(`${error.message} in ${dataPathname}`)
      }
      return value
    }
  } else {
    throw new Error(`Direct ${dataKind} file ${file} could not be read`)
  }
}
