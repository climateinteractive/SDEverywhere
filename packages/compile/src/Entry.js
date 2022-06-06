// Copyright (c) 2022 Climate Interactive / New Venture Fund

import path from 'path'
import B from 'bufx'

import { generateCode } from './CodeGen.js'
import { readXlsx } from './Helpers.js'
import Model from './Model.js'
import { parseModel } from './Parser.js'
import { readDat } from './ReadDat.js'
import { printSubscripts, yamlSubsList } from './Subscript.js'

/**
 * Parse a Vensim model and generate C code.
 *
 * This is the primary entrypoint for the `sde generate` command.
 *
 * - If `operation` is 'generateC', the generated C code will be written to `buildDir`.
 * - If `operation` is 'printVarList', variables and subscripts will be written to
 *   txt and yaml files under `buildDir`.
 * - If `operation` is 'printRefIdTest', reference identifiers will be printed to the console.
 * - If `operation` is 'convertNames', no output will be generated, but the results of model
 *   analysis will be available.
 *
 * @param input The preprocessed Vensim model text.
 * @param spec The model spec (from the JSON file).
 * @param operation Either 'generateC', 'printVarList', 'printRefIdTest', 'convertNames',
 * or empty string.
 * @param modelDirname The absolute path to the directory containing the mdl file.
 * The dat and xlsx files referenced by the spec will be relative to this directory.
 * @param modelName The model name (without the mdl extension).
 * @param buildDir The output directory where the C or list files will be written.
 * @return A string containing the generated C code.
 */
export function parseAndGenerate(input, spec, operation, modelDirname, modelName, buildDir) {
  // Read time series from external DAT files into a single object.
  // externalDatfiles is an array of either filenames or objects
  // giving a variable name prefix as the key and a filename as the value.
  let extData = new Map()
  if (spec.externalDatfiles) {
    for (let datfile of spec.externalDatfiles) {
      let prefix = ''
      let filename = ''
      if (typeof datfile === 'object') {
        prefix = Object.keys(datfile)[0]
        filename = datfile[prefix]
      } else {
        filename = datfile
      }
      let pathname = path.join(modelDirname, filename)
      let data = await readDat(pathname, prefix)
      extData = new Map([...extData, ...data])
    }
  }

  // Attach Excel workbook data to directData entries by file name.
  let directData = new Map()
  if (spec.directData) {
    for (let [file, xlsxFilename] of Object.entries(spec.directData)) {
      let pathname = path.join(modelDirname, xlsxFilename)
      directData.set(file, readXlsx(pathname))
    }
  }

  // Parse the model and generate code.
  let parseTree = parseModel(input)
  let code = generateCode(parseTree, { spec, operation, extData, directData, modelDirname })

  function writeOutput(filename, text) {
    let outputPathname = path.join(buildDir, filename)
    B.write(text, outputPathname)
  }

  if (operation === 'generateC') {
    // Write the generated C to a file
    writeOutput(`${modelName}.c`, code)
  }

  if (operation === 'printVarList') {
    // Write variables to a text file.
    writeOutput(`${modelName}_vars.txt`, Model.printVarList())
    // Write subscripts to a text file.
    writeOutput(`${modelName}_subs.txt`, printSubscripts())
    // Write variables to a YAML file.
    writeOutput(`${modelName}_vars.yaml`, Model.yamlVarList())
    // Write subscripts to a YAML file.
    writeOutput(`${modelName}_subs.yaml`, yamlSubsList())
  }

  return code
}

/**
 * Read the variable names from the given file, convert them to their
 * C or Vensim representation, and print the results to the console.
 *
 * This is used only to implement the `sde names` command.
 *
 * @param namesPathname The path to the file containing variables names.
 * @param operation Either 'to-c' or 'to-vensim'.
 */
export function printNames(namesPathname, operation) {
  let lines = B.lines(B.read(namesPathname))
  for (let line of lines) {
    if (line.length > 0) {
      if (operation === 'to-c') {
        B.emitLine(Model.cName(line))
      } else {
        B.emitLine(Model.vensimName(line))
      }
    }
  }
  B.printBuf()
}
