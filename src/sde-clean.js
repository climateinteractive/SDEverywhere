const path = require('path')
const sh = require('shelljs')
const { modelPathProps, buildDir } = require('./Helpers')

let command = 'clean <model>'
let describe = 'clean out the build directory for a model'
let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  }
}
let handler = argv => {
  clean(argv.model, argv)
}
let clean = (model, opts) => {
  // Remove the build directory.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  let silentState = sh.config.silent
  sh.config.silent = true
  sh.rm('-r', buildDirname)
  sh.config.silent = silentState
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  clean
}
