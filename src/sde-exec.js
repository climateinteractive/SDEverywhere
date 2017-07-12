const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { mdlPathProps, execCmd } = require('./Helpers')

let command = 'exec <model>'
let describe = 'execute the model and capture its output to a file'
let builder = {
  builddir: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
let handler = argv => {
  exec(argv.model, argv)
}
let exec = (model, opts) => {
  let { modelDirname, modelName, modelPathname } = mdlPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  fs.ensureDirSync(buildDirname)
  // Run the model and capture output in the model directory.
  let timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
  execCmd(`${buildDirname}/${modelName} >${modelDirname}/${modelName}_${timestamp}.txt`)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  exec
}
