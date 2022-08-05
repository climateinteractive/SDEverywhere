import fs from 'fs-extra'
import path from 'path'
import sh from 'shelljs'

import { buildDir, execCmd, modelPathProps, parentDirForFileUrl } from './utils.js'

export let command = 'compile [options] <model>'
export let describe = 'compile the generated model to an executable file'
export let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  }
}
export let handler = argv => {
  compile(argv.model, argv)
}
export let compile = (model, opts) => {
  let { modelDirname, modelName } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Link SDEverywhere C source files into the build directory.
  linkCSourceFiles(modelDirname, buildDirname)
  // Run make to compile the model C code.
  let silentState = sh.config.silent
  sh.config.silent = true
  sh.pushd(buildDirname)
  let exitCode = execCmd(`make P=${modelName}`)
  sh.popd()
  sh.config.silent = silentState
  if (exitCode > 0) {
    process.exit(exitCode)
  }
  return 0
}
export default {
  command,
  describe,
  builder,
  handler,
  compile
}

let linkCSourceFiles = (modelDirname, buildDirname) => {
  let srcDir = parentDirForFileUrl(import.meta.url)
  let cDirname = path.join(srcDir, 'c')
  sh.ls(cDirname).forEach(filename => {
    // If a C source file is present in the model directory, link to it instead
    // as an override.
    let srcPathname = path.join(modelDirname, filename)
    if (!fs.existsSync(srcPathname)) {
      srcPathname = path.join(cDirname, filename)
    }
    let dstPathname = path.join(buildDirname, filename)
    fs.ensureSymlinkSync(srcPathname, dstPathname)
  })
}
