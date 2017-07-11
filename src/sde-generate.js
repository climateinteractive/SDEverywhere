const fs = require('fs-extra')
const path = require('path')
const antlr4 = require('antlr4/index')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const F = require('./futil')

let modelDirname
let modelBasename

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
  modelDirname = path.dirname(argv.model)
  modelBasename = path.basename(argv.model).replace(/\.mdl/i, '')
  // Ensure the build directory exists.
  let buildDirname = argv.build || `${modelDirname}/build`
  fs.ensureDirSync(buildDirname)
  let outputPathname
  if (argv.genc) {
    outputPathname = path.join(buildDirname, `${modelBasename}.c`)
  } else if (argv.preprocess) {
    outputPathname = path.join(buildDirname, `${modelBasename}.mdl`)
  }
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
    console.log(e.stack)
  }
  // Output the generated code to the build directory.
  if (argv.genc) {
    try {
      fs.outputFileSync(outputPathname, code)
    } catch (e) {
      console.log(outputPathname)
      console.log(e.message)
    }
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
