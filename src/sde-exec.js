const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { modelPathProps, buildDir, outputDir, execCmd } = require('./Helpers')

let command = 'exec [options] <model>'
let describe = 'execute the model and capture its output to a file'
let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  outfile: {
    describe: 'output pathname',
    type: 'string',
    alias: 'o'
  }
}
let handler = argv => {
  exec(argv.model, argv)
}
let exec = (model, opts) => {
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build and output directories exist.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  let outputDirname = outputDir(opts.outfile, modelDirname)
  // Run the model and capture output in the model directory.
  let modelCmd = `${buildDirname}/${modelName}`
  let outputPathname
  if (opts.outfile) {
    outputPathname = opts.outfile
  } else {
    outputPathname = path.join(outputDirname, `${modelName}.txt`)
  }
  let exitCode = execCmd(`${modelCmd} >${outputPathname}`)
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
  exec
}
