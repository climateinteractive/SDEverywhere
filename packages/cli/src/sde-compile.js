import fs from 'fs-extra'
import path from 'path'
import sh from 'shelljs'

import { generate } from './sde-generate.js'

import { buildDir, execCmd, modelPathProps } from './utils.js'

export let command = 'compile [options] <model>'
export let describe = 'generate model code and compile it to an executable file'
export let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  }
}
export let handler = argv => {
  compile(argv.model, argv)
}
export let compile = async (model, opts) => {
  try {
    // Generate the C code
    opts.genc = true
    await generate(model, opts)

    // Compile the generated C code into an executable
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
  } catch (e) {
    // Exit with a non-zero error code if any step failed
    console.error(`ERROR: ${e.message}\n`)
    process.exit(1)
  }
}
export default {
  command,
  describe,
  builder,
  handler,
  compile
}

let linkCSourceFiles = (modelDirname, buildDirname) => {
  let cDirname = path.join(new URL('.', import.meta.url).pathname, 'c')
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
