const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const sh = require('shelljs')
const antlr4 = require('antlr4/index')
const browserify = require('browserify')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const { codeGenerator } = require('./CodeGen')
const { preprocessModel } = require('./Preprocessor')
const { modelPathProps, buildDir, webDir, linkCSourceFiles, execCmd, readDat } = require('./Helpers')
const { makeModelSpec, makeModelConfig } = require('./MakeConfig')
const F = require('./futil')

let command = 'generate [options] <model>'
let describe = 'generate model code'
let builder = {
  genc: {
    describe: 'generate C code for the model',
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
  // Generate a spec file from the app.yaml file for web apps.
  // This overrides the --spec argument if present.
  if (opts.genhtml) {
    opts.spec = makeModelSpec(modelDirname)
  }
  // Preprocess model text into parser input. Stop now if that's all we're doing.
  let spec = parseSpec(opts.spec)
  let extData = readDatFiles(spec.datfiles)
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
  let code = codeGenerator(parseTree, spec, operation, extData).generate()
  if (opts.genc || opts.genhtml) {
    let outputPathname = path.join(buildDirname, `${modelName}.c`)
    writeOutput(outputPathname, code)
  }
  // Generate a web app for the model.
  if (opts.genhtml) {
    let webDirname = webDir(buildDirname)
    linkCSourceFiles(modelDirname, buildDirname)
    if (generateWASM(buildDirname, webDirname) === 0) {
      makeModelConfig(modelDirname, webDirname)
      copyTemplate(buildDirname)
      packApp(webDirname)
    }
  }
}
let generateWASM = (buildDirname, webDirname) => {
  // Generate WASM from C source files in the build directory.
  let sourceFiles = sh.ls(`${buildDirname}/*.c`)
  let args = R.reject(pathname => pathname.endsWith('main.c'), sourceFiles)
  // Include the build directory as a place to look for header files.
  args.push(`-I${buildDirname}`)
  // Set the output pathname for the JavaScript wrapper to the web directory.
  // The WASM file will be written to the same directory and basename.
  args.push('-o')
  args.push(path.join(webDirname, 'model_sde.js'))
  // Set flags for WASM compilation and optimization.
  // Use -O0 optimization in development to get readable model_sde.js wrapper source.
  // Use -O3 optimization for productions runs.
  args.push('-s WASM=1 -Wall -O3')
  // Turn on safe heap to debug "application has corrupted its heap memory area" exceptions.
  // Also turn on the clamp when using safe heap. Ref: https://github.com/WebAssembly/binaryen/issues/1110
  // args.push('-s SAFE_HEAP=1')
  // args.push('-s "BINARYEN_TRAP_MODE=\'clamp\'"')
  // Prevent the WASM code from exiting after it runs the model.
  args.push('-s NO_EXIT_RUNTIME=1')
  // Export the function that runs the model.
  args.push('-s EXPORTED_FUNCTIONS="[\'_run_model\']"')
  // Export the Module.cwrap method used to wrap arguments.
  args.push('-s "EXTRA_EXPORTED_RUNTIME_METHODS=[\'cwrap\']"')
  // Run the emcc command to generate WASM code.
  let cmd = `emcc ${args.join(' ')}`
  // console.log(cmd)
  let exitCode = execCmd(cmd)
  if (exitCode) {
    console.error('The Emscripten SDK must be installed in your path.')
  }
  return exitCode
}
let copyTemplate = buildDirname => {
  // Copy template files from the src/web directory.
  let templatePath = path.join(__dirname, 'web')
  sh.cp('-Rf', templatePath, buildDirname)
}
let packApp = webDirname => {
  let sourcePathname = path.join(webDirname, 'index.js')
  let minPathname = path.join(webDirname, 'index.min.js')
  let b = browserify(sourcePathname)
  let writable = fs.createWriteStream(minPathname)
  b.bundle().pipe(writable)
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
let readDatFiles = datfiles => {
  // Read time series from external DAT files into a single object.
  let extData = new Map()
  if (datfiles) {
    R.forEach(pathname => {
      let data = readDat(pathname)
      extData = new Map([...extData, ...data])
    }, datfiles)
  }
  return extData
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
