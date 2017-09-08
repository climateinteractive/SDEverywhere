const fs = require('fs-extra')
const json5 = require('json5')
const path = require('path')
const sh = require('shelljs')
const antlr4 = require('antlr4/index')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const { modelPathProps, buildDir } = require('./Helpers')
const F = require('./futil')

let command = 'generate [options] <model>'
let describe = 'generate model code'
let builder = {
  genc: {
    describe: 'generate C code for the model',
    type: 'boolean'
  },
  genwebc: {
    describe: 'generate web-enabled C for the model',
    type: 'boolean'
  },
  genhtml: {
    describe: 'generate an HTML UI for the model',
    type: 'boolean'
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
let handler = argv => {
  generate(argv.model, argv)
}

let generate = (model, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  //an options map for code generation
  let codeGenOpts = {}

  //check to see whether we're building for the web
  if (opts.genwebc || opts.genhtml) {
    //check for specs .json
    if (!opts.spec) {
      console.log('You must provide a model spec JSON for web-enabled SDE')
      process.exit(-1)
    }
    //if generating C for web, then populate setInputs()
    codeGenOpts.setInputs_web = true
  } //if (opts.genwebc || opts.genhtml) {

  // Preprocess model text into parser input. Stop now if that's all we're doing.
  let spec = parseSpec(opts.spec)
  let writeRemovals = opts.preprocess
  let input = preprocessModel(modelPathname, spec, writeRemovals)
  if (opts.preprocess) {
    let outputPathname = path.join(buildDirname, `${modelName}.mdl`)
    writeOutput(outputPathname, input)
    process.exit(0)
  }

  // Parse the model and generate code.
  let operation = 'generateC'
  if (opts.list) {
    operation = 'printVarList'
  } else if (opts.refidtest) {
    operation = 'printRefIdTest'
  }
  let parseTree = parseModel(input)
  let code = codeGenerator(parseTree, spec, operation, codeGenOpts).generate()
  if (opts.genc || opts.genwebc) {
    let outputPathname = path.join(buildDirname, `${modelName}.c`)
    writeOutput(outputPathname, code)
  }

  //generate HTML model
  if (opts.genhtml) {
    let modelJS = `sd_${modelName}.js` //generate HTML model
    createHTML(modelDirname, buildDirname, modelName, modelJS, spec)
    process.exit(1)
  }
}

/**
Copies the HTML & page JS from the src/web directory
Replaces the model-specific variables with contents of the model specs JSON
**/
let createHTML = (modelDirname, buildDirname, modelName, modelJS, spec) => {
  //destination directory of web application
  var web_app_path = path.join(modelDirname, 'html')

  //copy template files directory over from $SDE_HOME/src/web/html
  var templatePath = path.join(__dirname, 'web', 'html')
  sh.cp('-rf', templatePath, modelDirname)

  //insert model-specific varuabkes into local copy of index.html
  var index_html_path = path.join(web_app_path, 'includes', 'sde.js')
  sh.sed('-i', '::modelName_::', '"' + modelName + '"', index_html_path)
  sh.sed('-i', '::modelJS_::', '"' + modelJS + '"', index_html_path)
  sh.sed('-i', '::inputVarDef_::', JSON.stringify(spec.inputVarDef), index_html_path)
  sh.sed('-i', '::outputVars_::', JSON.stringify(spec.outputVars), index_html_path)
  sh.sed('-i', '::viewButtons_::', JSON.stringify(spec.viewButtons), index_html_path)

  //copy JS & wasm from the build directory
  sh.cp(path.join(buildDirname, '*.js'), web_app_path)
  sh.cp(path.join(buildDirname, '*.wasm'), web_app_path)
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
  var parsedJSON = parseJsonFile(specFilename)

  //get a simple list if inputVars
  if ('inputVarDef' in parsedJSON) {
    parsedJSON.inputVars = Object.keys(parsedJSON.inputVarDef)
  }
  return parsedJSON
}

let parseJsonFile = filename => {
  // Parse the JSON file if it exists. JSON5 format is supported.
  let result = {}
  try {
    let json = fs.readFileSync(filename, 'utf8')
    result = json5.parse(json)
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
module.exports = {
  command,
  describe,
  builder,
  handler,
  generate
}
