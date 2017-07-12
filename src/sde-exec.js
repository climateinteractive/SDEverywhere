const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { mdlPathProps, execCmd } = require('./Helpers')

exports.command = 'exec <model>'
exports.describe = 'execute the model and capture its output to a file'
exports.builder = {
  build: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
exports.handler = argv => {
  let { modelDirname, modelName, modelPathname } = mdlPathProps(argv.model)
  // Ensure the build directory exists.
  let buildDirname = argv.build || path.join(modelDirname, 'build')
  fs.ensureDirSync(buildDirname)
  // Run the model and capture output in the model directory.
  let timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
  execCmd(`${buildDirname}/${modelName} >${modelDirname}/${modelName}_${timestamp}.txt`)
}
