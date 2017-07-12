const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { mdlPathProps, execCmd } = require('./Helpers')

let command = 'clean <model>'
let describe = 'clean out the build directory for a model'
let builder = {
  builddir: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
let handler = argv => {
  clean(argv.model, argv)
}
let clean = (model, opts) => {
  let { modelDirname, modelName, modelPathname } = mdlPathProps(model)
  // Ensure the build directory exists and empty it.
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  fs.emptyDirSync(buildDirname)
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  clean
}
