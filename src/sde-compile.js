const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const { modelPathProps, buildDir, execCmd } = require('./Helpers')

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
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Link our C source files in the build directory.
  let cDirname = path.join(__dirname, 'c')
  sh.ls(cDirname).forEach(filename => {
    let srcPathname = path.join(cDirname, filename)
    let dstPathname = path.join(buildDirname, filename)
    fs.ensureSymlinkSync(srcPathname, dstPathname)
  })
  // Run make to compile the model C code.
  sh.cd(buildDirname)
  let exitCode = execCmd(`make P=${modelName}`)
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
