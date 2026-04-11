// Copyright (c) 2022 Climate Interactive / New Venture Fund

import path from 'path'

import { parseVensimModel, parseXmileModel } from '@sdeverywhere/parse'

import B from './_shared/bufx.js'
import { readXlsx } from './_shared/helpers.js'
import { readDat } from './_shared/read-dat.js'
import { printSubscripts } from './_shared/subscript.js'
import { cName } from './_shared/var-names.js'
import Model from './model/model.js'
import { getDirectSubscripts } from './model/read-subscripts.js'
import { generateCode } from './generate/gen-code.js'

/**
 * Parse a Vensim or XMILE model and generate C code.
 *
 * This is the primary entrypoint for the `sde generate` command.
 *
 * - If `operations` has 'generateC', the generated C code will be written to `buildDir`.
 * - If `operations` has 'generateJS', the generated JS code will be written to `buildDir`.
 * - If `operations` has 'printVarList', variables and subscripts will be written to
 *   txt and json files under `buildDir`.
 * - If `operations` has 'printRefIdTest', reference identifiers will be printed to the console.
 * - If `operations` has 'convertNames', no output will be generated, but the results of model
 *   analysis will be available.
 *
 * @param {string} input The preprocessed Vensim or XMILE model text.
 * @param {string} modelKind The kind of model to parse, either 'vensim' or 'xmile'.
 * @param {*} spec The model spec (from the JSON file).
 * @param {string[]} operations The set of operations to perform; can include 'generateC', 'generateJS',
 * 'printVarList', 'printRefIdTest', 'convertNames'.  If the array is empty, the model will be
 * read but no operation will be performed.
 * @param {string} modelDirname The absolute path to the directory containing the mdl file.
 * The dat and xlsx files referenced by the spec will be relative to this directory.
 * @param {string} modelName The model name (without the mdl extension).
 * @param {string} buildDir The output directory where the C or list files will be written.
 * @param {string} [varname] The variable name passed to the 'sde causes' command.
 * @return A string containing the generated C code.
 */
export async function parseAndGenerate(input, modelKind, spec, operations, modelDirname, modelName, buildDir, varname) {
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

  // Parse the model and generate code
  let parsedModel = parseModel(input, modelKind, modelDirname)
  let code = generateCode(parsedModel, { spec, operations, extData, directData, modelDirname, varname })

  function writeOutput(filename, text) {
    let outputPathname = path.join(buildDir, filename)
    B.write(text, outputPathname)
  }

  if (operations.includes('generateC')) {
    // Write the generated C to a file
    writeOutput(`${modelName}.c`, code)
  }

  if (operations.includes('generateJS')) {
    // Write the generated JS to a file
    writeOutput(`${modelName}.js`, code)
  }

  if (operations.includes('printVarList')) {
    // Write variables to a text file.
    writeOutput(`${modelName}_vars.txt`, Model.printVarList())
    // Write subscripts to a text file.
    writeOutput(`${modelName}_subs.txt`, printSubscripts())
    // Write variables and subscripts to a JSON file.
    const jsonList = Model.jsonList()
    writeOutput(`${modelName}.json`, JSON.stringify(jsonList.full, null, 2))
    // Write minimal variable index and dimension specs to a JSON file used
    // by the runtime package to initialize a `ModelListing` instance).
    writeOutput(`${modelName}_min.json`, JSON.stringify(jsonList.minimal, null, 2))
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
        B.emitLine(cName(line))
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
 * @param {string} modelKind The kind of model to parse, either 'vensim' or 'xmile'.
 * @param {string} modelDir The absolute path to the directory containing the mdl file.
 * The dat, xlsx, and csv files referenced by the model will be relative to this directory.
 * @param {Object} [options] The options that control parsing.
 * @param {boolean} options.sort Whether to sort definitions alphabetically in the preprocess step.
 * @return {*} A parsed tree representation of the model.
 */
export function parseModel(input, modelKind, modelDir, options) {
  if (modelKind === 'vensim') {
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

    // Parse the Vensim model
    const sort = options?.sort === true
    const root = parseVensimModel(input, parseContext, sort)

    return {
      kind: 'vensim',
      root
    }
  } else {
    // Parse the XMILE model
    const root = parseXmileModel(input)

    return {
      kind: 'xmile',
      root
    }
  }
}
