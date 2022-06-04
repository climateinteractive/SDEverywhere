import sh from 'shelljs'
import { modelPathProps, buildDir, linkCSourceFiles, execCmd } from './Helpers.js'

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
