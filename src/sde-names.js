const path = require('path')
const antlr4 = require('antlr4/index')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const { vensimName, cName } = require('./Model')
const { modelPathProps } = require('./Helpers')
const B = require('bufx')

let command = 'names [options] <model> <namesfile>'
let describe = 'convert variable names in a model'
let builder = {
  toc: {
    describe: 'convert a file with Vensim variable names to C names',
    type: 'boolean'
  },
  tovml: {
    describe: 'convert a file with C variable names to Vensim names',
    type: 'boolean'
  },
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  }
}
let handler = argv => {
  names(argv.model, argv.namesfile, argv)
}
let names = (model, namesPathname, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  let spec = parseSpec(opts.spec)
  // Preprocess model text into parser input.
  let input = preprocessModel(modelPathname, spec)
  // Parse the model to get variable and subscript information.
  let parseTree = parseModel(input)
  let operation = 'convertNames'
  codeGenerator(parseTree, { spec, operation }).generate()
  // Read each variable name from the names file and convert it.
  let lines = B.lines(B.read(namesPathname))
  for (let line of lines) {
    if (line.length > 0) {
      if (opts.toc) {
        B.emitLine(cName(line))
      } else if (opts.tovml) {
        B.emitLine(vensimName(line))
      }
    }
  }
  B.printBuf()
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
module.exports = {
  command,
  describe,
  builder,
  handler
}
