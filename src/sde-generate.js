const fs = require('fs-extra')
const path = require('path')
const antlr4 = require('antlr4/index')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const { mdlPathProps } = require('./Helpers')
const F = require('./futil')

exports.command = 'generate [options] <model>'
exports.describe = 'generate model code'
exports.builder = {
  genc: {
    describe: 'generate C code for the model',
    type: 'boolean',
    alias: 'c'
  },
  list: {
    describe: 'list model variables',
    type: 'boolean',
    alias: 'l'
  },
  preprocess: {
    describe: 'output the preprocessed model',
    type: 'boolean',
    alias: 'p'
  },
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  build: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  },
  refidtest: {
    describe: 'test reference ids',
    type: 'boolean',
    alias: 'r'
  }
}
exports.handler = argv => {
  // Parse input files and then hand data to the code generator.
  let { modelDirname, modelName, modelPathname } = mdlPathProps(argv.model)
  // Ensure the build directory exists.
  let buildDirname = argv.build || path.join(modelDirname, 'build')
  fs.ensureDirSync(buildDirname)
  // Preprocess model text into parser input. Stop now if that's all we're doing.
  let writeRemovals = argv.preprocess
  let input = preprocessModel(modelPathname, writeRemovals)
  if (argv.preprocess) {
    let outputPathname = path.join(buildDirname, `${modelName}.mdl`)
    writeOutput(outputPathname, input)
    process.exit()
  }
  // Parse the model and generate code.
  let listMode = ''
  if (argv.list) {
    listMode = 'printVarList'
  } else if (argv.refidtest) {
    listMode = 'printRefIdTest'
  }
  let parseTree = parseModel(input)
  let spec = parseSpec(argv.spec)
  let code = codeGenerator(parseTree, spec, listMode).generate()
  if (argv.genc) {
    let outputPathname = path.join(buildDirname, `${modelName}.c`)
    writeOutput(outputPathname, code)
  }
  process.exit(0)
}
let parseModel = input => {
  // Read the model text and return a parse tree.
  let chars = new antlr4.InputStream(input)
  let lexer = new ModelLexer(chars)
  let tokens = new antlr4.CommonTokenStream(lexer)
  let parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  return parser.model()
}
let parseSpec = specFilename => {
  return parseJsonFile(specFilename)
}
let parseJsonFile = filename => {
  // Parse the JSON file if it exists.
  let result = {}
  try {
    let json = fs.readFileSync(filename, 'utf8')
    result = JSON.parse(json)
    // console.error(`loaded ${filename}`);
  } catch (ex) {
    // If the file doesn't exist, return an empty object without complaining.
  }
  return result
}
let writeOutput = (outputPathname, outputText) => {
  try {
    fs.outputFileSync(outputPathname, outputText)
  } catch (e) {
    console.log(outputPathname)
    console.log(e.message)
  }
}
