const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const R = require('ramda');
const { modelPathProps, buildDir, execCmd } = require('./Helpers')

let command = 'compile [options] <model>'
let describe = 'compile the generated model to an executable file'
let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  wasm: {
    describe: 'compile to a WebAssembly binary',
    type: 'boolean'
  }
}
let handler = argv => {
  compile(argv.model, argv)
}
let compile = (model, opts) => {
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Link our C source files in the build directory.
  let cDirname = path.join(__dirname, 'c')
  sh.ls(cDirname).forEach(filename => {
    // If a C source file is present in the model directory, link to it instead
    // as an override.
    let srcPathname = path.join(modelDirname, filename)
    if (!fs.existsSync(srcPathname)) {
      srcPathname = path.join(cDirname, filename)
    }
    let dstPathname = path.join(buildDirname, filename)
    fs.ensureSymlinkSync(srcPathname, dstPathname)
  })

  if (opts.wasm) {
    let modelJS = `sd_${modelName}.js`
    compileWASM(modelName, modelJS, buildDirname)
  } else {
    // Run make to compile the model C code.
    let silentState = sh.config.silent
    sh.config.silent = true
    sh.pushd(buildDirname)
    let exitCode = execCmd(`make P=${modelName}`)
    sh.popd()
    sh.config.silent = silentState
    if (exitCode > 0) {
      process.exit(exitCode)
    }
  }

  return 0
}

let compileWASM = (modelName, modelJS, buildDirname) => {
  // Compile WASM from C source files in the build directory.
  let emccArgs = []
  // Add the source files from the buildDir.
  sh.ls(buildDirname).forEach(filename => {
    if (R.endsWith('.c', filename)) {
      let srcPathname = path.join(buildDirname, filename)
      emccArgs.push(srcPathname)
    }
  })
  // Include the buildDir as a place to look for .h files.
  emccArgs.push('-I' + buildDirname)
  // Set the output JS path (WASM will be in same dir).
  emccArgs.push('-o')
  emccArgs.push(path.join(buildDirname, modelJS))
  // Set other flags for WASM compilation and optimization.
  emccArgs.push('-s')
  emccArgs.push('WASM=1')
  emccArgs.push('-Wall')
  // Run emcc to generate wasm code.
  let cmd = `emcc ${emccArgs.join(' ')}`
  let exitCode = execCmd(cmd)
  if (exitCode) {
    console.log('The Emscripten SDK must be installed in your path.')
  }
  process.exit(exitCode)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  compile
}
