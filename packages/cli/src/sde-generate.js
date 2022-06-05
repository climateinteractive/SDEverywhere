import path from 'path'

import B from 'bufx'

import { parseModel } from '@sdeverywhere/compile'

import { codeGenerator } from './CodeGen.js'
import { preprocessModel } from './Preprocessor.js'
import { canonicalName, buildDir, readDat, readXlsx } from './Helpers.js'
import Model from './Model.js'
import { printSubscripts, yamlSubsList } from './Subscript.js'
import { modelPathProps } from './utils.js'

export let command = 'generate [options] <model>'
export let describe = 'generate model code'
export let builder = {
  genc: {
    describe: 'generate C code for the model',
    type: 'boolean'
  },
  list: {
    describe: 'list model variables',
    type: 'boolean',
    alias: 'l'
  },
  preprocess: {
    describe: 'write a preprocessed model that runs in Vensim',
    type: 'boolean',
    alias: 'p'
  },
  analysis: {
    describe: 'write a nonexecutable preprocessed model for analysis',
    type: 'boolean',
    alias: 'a'
  },
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  refidtest: {
    describe: 'test reference ids',
    type: 'boolean',
    alias: 'r'
  }
}
export let handler = argv => {
  generate(argv.model, argv)
}

export let generate = async (model, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Preprocess model text into parser input. Stop now if that's all we're doing.
  let spec = parseSpec(opts.spec)
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
  // Produce a runnable model with the "genc" and "preprocess" options.
  let profile = opts.analysis ? 'analysis' : 'genc'
  // Write the preprocessed model and removals if the option is "analysis" or "preprocess".
  let writeFiles = opts.analysis || opts.preprocess
  let input = preprocessModel(modelPathname, spec, profile, writeFiles)
  if (writeFiles) {
    let outputPathname = path.join(buildDirname, `${modelName}.mdl`)
    writeOutput(outputPathname, input)
    process.exit(0)
  }
  // Parse the model and generate code. If no operation is specified, the code generator will
  // read the model and do nothing else. This is required for the list operation.
  let operation = ''
  if (opts.genc) {
    operation = 'generateC'
  } else if (opts.list) {
    operation = 'printVarList'
  } else if (opts.refidtest) {
    operation = 'printRefIdTest'
  }
  let parseTree = parseModel(input)
  let code = codeGenerator(parseTree, { spec, operation, extData, directData, modelDirname }).generate()
  if (opts.genc) {
    let outputPathname = path.join(buildDirname, `${modelName}.c`)
    writeOutput(outputPathname, code)
  }
  if (opts.list) {
    let outputPathname, outputText
    // Write variables to a text file.
    outputPathname = path.join(buildDirname, `${modelName}_vars.txt`)
    outputText = Model.printVarList()
    writeOutput(outputPathname, outputText)
    // Write subscripts to a text file.
    outputPathname = path.join(buildDirname, `${modelName}_subs.txt`)
    outputText = printSubscripts()
    writeOutput(outputPathname, outputText)
    // Write variables to a YAML file.
    outputPathname = path.join(buildDirname, `${modelName}_vars.yaml`)
    outputText = Model.yamlVarList()
    writeOutput(outputPathname, outputText)
    // Write subscripts to a YAML file.
    outputPathname = path.join(buildDirname, `${modelName}_subs.yaml`)
    outputText = yamlSubsList()
    writeOutput(outputPathname, outputText)
  }
}
let parseSpec = specFilename => {
  let spec = parseJsonFile(specFilename)
  // Translate dimension families in the spec to canonical form.
  if (spec.dimensionFamilies) {
    let f = {}
    for (let dimName in spec.dimensionFamilies) {
      let family = spec.dimensionFamilies[dimName]
      f[canonicalName(dimName)] = canonicalName(family)
    }
    spec.dimensionFamilies = f
  }
  return spec
}
let parseJsonFile = filename => {
  // Parse the JSON file if it exists.
  let result = {}
  try {
    let json = B.read(filename)
    result = JSON.parse(json)
    // console.error(`loaded ${filename}`);
  } catch (ex) {
    // If the file doesn't exist, return an empty object without complaining.
  }
  return result
}
let writeOutput = (outputPathname, outputText) => {
  try {
    B.write(outputText, outputPathname)
  } catch (e) {
    console.log(outputPathname)
    console.log(e.message)
  }
}
export default {
  command,
  describe,
  builder,
  handler,
  generate
}
