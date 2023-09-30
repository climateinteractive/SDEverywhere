// Copyright (c) 2022 Climate Interactive / New Venture Fund

import path from 'path'
import B from 'bufx'

import { parseVensimModel } from '@sdeverywhere/parse'

import { readXlsx } from './_shared/helpers.js'
import { readDat } from './_shared/read-dat.js'
import { printSubscripts, yamlSubsList } from './_shared/subscript.js'
import { parseModel as legacyParseVensimModel } from './parse/parser.js'
import Model from './model/model.js'
import { getDirectSubscripts } from './model/read-subscripts.js'
import { generateCode } from './generate/code-gen.js'

/**
 * Parse a Vensim model and generate C code.
 *
 * This is the primary entrypoint for the `sde generate` command.
 *
 * - If `operation` is 'generateC', the generated C code will be written to `buildDir`.
 * - If `operation` is 'printVarList', variables and subscripts will be written to
 *   txt, yaml, and json files under `buildDir`.
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
export async function parseAndGenerate(input, spec, operation, modelDirname, modelName, buildDir) {
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
  let parsedModel = parseModel(input, modelDirname)
  let code = generateCode(parsedModel, { spec, operation, extData, directData, modelDirname })

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
    // Write variables and subscripts to a JSON file.
    writeOutput(`${modelName}.json`, Model.jsonList())
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

/**
 * Read and parse the given model text and return the parsed model structure.
 *
 * TODO: Fix return type
 *
 * @param {string} input The string containing the model text.
 * @param {string} modelDir The absolute path to the directory containing the mdl file.
 * The dat, xlsx, and csv files referenced by the model will be relative to this directory.
 * @param {boolean} sort Whether to sort definitions alphabetically in the preprocess step.
 * @return {*} A parsed tree representation of the model.
 */
export function parseModel(input, modelDir, sort = false) {
  if (process.env.SDE_PRIV_USE_NEW_PARSE !== '1') {
    // Use the legacy parser
    return {
      kind: 'vensim-legacy',
      parseTree: legacyParseVensimModel(input)
    }
  }

  // Prepare the parse context that provides access to external data files
  let parseContext /*: VensimParseContext*/
  if (modelDir) {
    parseContext = {
      getDirectSubscripts(fileName, tabOrDelimiter, firstCell, lastCell /*, prefix*/) {
        // Resolve the CSV file relative the model directory
        const csvPath = path.resolve(modelDir, fileName)

        // Read the subscripts from the CSV file
        return getDirectSubscripts(csvPath, tabOrDelimiter, firstCell, lastCell)
      }
    }
  }

  // Parse the model
  // TODO: The `parseVensimModel` function currently implicitly runs the preprocess
  // step on the input text.  We should make this configurable (because `parseModel`
  // is currently called after the legacy preprocessor has already been run).
  // TODO: We currently sort the preprocessed definitions alphabetically for
  // compatibility with the legacy preprocessor.  Once we drop the legacy code
  // we could remove this step and update the tests to use the original order.
  const root = parseVensimModel(input, parseContext, sort)

  return {
    kind: 'vensim',
    root
  }
}
