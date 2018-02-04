const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const R = require('ramda')
const { modelPathProps, buildDir, linkCSourceFiles, execCmd } = require('./Helpers')

let command = 'compile [options] <model>'
let describe = 'compile the generated model to an executable file'
let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  }
}
let handler = argv => {
  compile(argv.model, argv)
}
let compile = (model, opts) => {
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Link SDEverywhere C source files into the build directory.
  linkCSourceFiles(modelDirname, buildDirname)
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
  return 0
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  compile
}
