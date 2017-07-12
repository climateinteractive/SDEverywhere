const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const { mdlPathProps } = require('./Helpers')

// pushd $SDE_HOME/c >/dev/null
// ln -sf $SDE_HOME/build/$MDL_NAME.c .
// export P=$MDL_NAME
// make >/dev/null
// mv $MDL_NAME $SDE_HOME/build
// rm $MDL_NAME.c
// popd >/dev/null

exports.command = 'compile <model>'
exports.describe = 'compile the generated model to an executable file'
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
  // Link our C source files in the build directory.
  let cDirname = path.resolve('../c')
  sh.ls(cDirname).forEach(filename => {
    let srcPathname = path.join(cDirname, filename)
    let dstPathname = path.join(buildDirname, filename)
    sh.ln('-sf', srcPathname, dstPathname)
  })
  // Run make to compile the model C code.
  sh.cd(buildDirname)
  let cmd = `make P=${modelName}`
  sh.exec(cmd, {silent:true}, (code, stdout, stderr) => {
    if (code) {
      console.log(stderr)
    }
  })
}
