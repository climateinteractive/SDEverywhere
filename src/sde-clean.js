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
  },
  html: {
    describe: 'cleans the HTML directory',
    type: 'boolean'
  }
}
let handler = argv => {
  clean(argv.model, argv)
}
let clean = (model, opts) => {
  // Remove the build & html directory.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  let htmlDirname = path.join(modelDirname, 'html')

  let silentState = sh.config.silent
  sh.config.silent = true
  sh.rm('-r', buildDirname)
  //also remove HTML directory if flag is set
  if (opts.html) sh.rm('-r', htmlDirname)
  sh.config.silent = silentState
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  clean
}
