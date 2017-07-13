const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const { modelPathProps, execCmd } = require('./Helpers')

let command = 'compile <model>'
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
  let buildDirname = opts.builddir || path.join(modelDirname, 'build')
  fs.ensureDirSync(buildDirname)
  // Link our C source files in the build directory.
  let cDirname = path.resolve('../c')
  sh.ls(cDirname).forEach(filename => {
    let srcPathname = path.join(cDirname, filename)
    let dstPathname = path.join(buildDirname, filename)
    fs.ensureSymlinkSync(srcPathname, dstPathname)
  })
  // Run make to compile the model C code.
  sh.cd(buildDirname)
  execCmd(`make P=${modelName}`)
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  compile
}
