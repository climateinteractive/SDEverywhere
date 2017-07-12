const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { mdlPathProps, execCmd } = require('./Helpers')

exports.command = 'clean <model>'
exports.describe = 'clean out the build directory for a model'
exports.builder = {
  build: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
exports.handler = argv => {
  let { modelDirname, modelName, modelPathname } = mdlPathProps(argv.model)
  // Ensure the build directory exists and empty it.
  let buildDirname = argv.build || path.join(modelDirname, 'build')
  fs.emptyDirSync(buildDirname)
}
