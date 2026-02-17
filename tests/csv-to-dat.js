#!/usr/bin/env node

/**
 * Convert a CSV file (exported from Stella/XMILE) to a DAT file (Vensim format).
 *
 * Usage: node csv-to-dat.js <input.csv> <output.dat>
 *
 * The CSV file should have:
 * - A header row with variable names (first column is time, e.g., "Months")
 * - Data rows with time values in the first column
 *
 * The DAT file will have:
 * - Each variable on its own line
 * - Followed by tab-separated time-value pairs
 * - Empty values are skipped
 * - Subscripts are converted from "var[A1, B1]" to "var[A1,B1]" (spaces removed)
 */

import { readFileSync, writeFileSync } from 'fs'
import { parse as parseCsv } from 'csv-parse/sync'

/**
 * Convert a variable name from CSV format to DAT format.
 * Remove spaces after commas inside subscript brackets.
 *
 * @param name The variable name from CSV (e.g., "f[A1, B1]").
 * @returns The variable name in DAT format (e.g., "f[A1,B1]").
 */
function convertVarName(name) {
  return name.replace(/\[([^\]]+)\]/g, (match, subscripts) => {
    return '[' + subscripts.replace(/,\s+/g, ',') + ']'
  })
}

/**
 * Convert a CSV file to DAT format.
 *
 * @param inputPath Path to the input CSV file.
 * @param outputPath Path to the output DAT file.
 */
function convertCsvToDat(inputPath, outputPath) {
  const content = readFileSync(inputPath, 'utf-8')
  const rows = parseCsv(content, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true
  })

  if (rows.length < 2) {
    console.error('Error: CSV file must have at least a header row and one data row')
    process.exit(1)
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)
  const output = []

  // Process each variable (skip first column which is time)
  for (let col = 1; col < headers.length; col++) {
    const varName = convertVarName(headers[col])

    // Collect time-value pairs where value is not empty
    const pairs = []
    for (const row of dataRows) {
      const time = row[0]
      const value = row[col]
      if (value !== undefined && value !== '') {
        pairs.push([time, value])
      }
    }

    // Only output variables that have at least one value
    if (pairs.length > 0) {
      output.push(varName)
      for (const [time, value] of pairs) {
        output.push(`${time}\t${value}`)
      }
    }
  }

  writeFileSync(outputPath, output.join('\n') + '\n')
}

// Main
const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error('Usage: node csv-to-dat.js <input.csv> <output.dat>')
  process.exit(1)
}

convertCsvToDat(args[0], args[1])
