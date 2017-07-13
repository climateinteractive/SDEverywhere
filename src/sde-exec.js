const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { modelPathProps, execCmd } = require('./Helpers')

let command = 'exec <model>'
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
  // Ensure the build directory exists.
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  fs.ensureDirSync(buildDirname)
  // Run the model and capture output in the model directory.
  let modelCmd = `${buildDirname}/${modelName}`
  let outputPathname
  if (opts.outfile) {
    outputPathname = opts.outfile
  } else {
    let timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
    outputPathname = path.join(modelDirname, `${modelName}_${timestamp}.txt`)
  }
  execCmd(`${modelCmd} >${outputPathname}`)
  debugger
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  exec
}
