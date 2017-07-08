const fs = require('fs')
const path = require('path')
const antlr4 = require('antlr4/index')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const F = require('./futil')

let modelDirname
let modelBasename

exports.command = 'generate <model>'
exports.describe = 'generate model code'
exports.builder = {
  spec: {
    describe: 'filename of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  list: {
    describe: 'list model variables',
    type: 'boolean',
    alias: 'l'
  },
  refidtest: {
    describe: 'test reference ids',
    type: 'boolean',
    alias: 'r'
  },
  preprocess: {
    describe: 'output the preprocessed model',
    type: 'boolean',
    alias: 'p'
  }
}
exports.handler = argv => {
  // Parse input files and then hand data to the code generator.
  modelDirname = path.dirname(argv.model)
  modelBasename = path.basename(argv.model).replace(/\.mdl/i, '')
  let spec = parseSpec(argv.spec)
  let parseTree = parseModel(argv.model, spec, argv.preprocess)
  let listMode = ''
  let code = ''
  if (argv.list) {
    listMode = 'printVarList'
  } else if (argv.refidtest) {
    listMode = 'printRefIdTest'
  }
  try {
    code = codeGenerator(parseTree, spec, listMode).generate()
  } catch (e) {
    // console.log('code generator exception: ' + e.message)
    console.log(e.stack)
  }
  // Print the generated code.
  if (!(argv.list || argv.refidtest)) {
    console.log(code)
  }
  process.exit(0)
}
function parseModel(modelFilename, spec, preprocess) {
  // Read the mdl file and return a parse tree.
  let writeRemovals = preprocess
  let input = preprocessModel(modelFilename, spec, writeRemovals)
  if (preprocess) {
    console.log(input)
    process.exit()
  }
  let chars = new antlr4.InputStream(input)
  let lexer = new ModelLexer(chars)
  let tokens = new antlr4.CommonTokenStream(lexer)
  let parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  return parser.model()
}
function parseSpec(specFilename) {
  return parseJsonFile(specFilename)
}
function parseJsonFile(filename) {
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
