import { existsSync } from 'fs'
import path from 'path'

import { buildDir, execCmd, modelPathProps, outputDir } from './utils.js'

export let command = 'exec [options] <model>'
export let describe = 'execute the model and capture its output to a file'
export let builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  outfile: {
    describe: 'output pathname',
    type: 'string',
    alias: 'o'
  }
}
export let handler = argv => {
  exec(argv.model, argv)
}
export let exec = (model, opts) => {
  let { modelDirname, modelName } = modelPathProps(model)
  // Ensure the build and output directories exist.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  let outputDirname = outputDir(opts.outfile, modelDirname)
  // If `main.js` exists, it means that the generated code format
  // is JS, so run that file, otherwise we assume the generated
  // code format is C and that there is a native executable with
  // the same name as the model.
  let mainJs = path.join(buildDirname, 'main.js')
  let mainC = path.join(buildDirname, modelName)
  let modelCmd
  if (existsSync(mainJs)) {
    modelCmd = mainJs
  } else if (existsSync(mainC)) {
    modelCmd = mainC
  } else {
    console.error('ERROR: No executable model found in build directory')
    process.exit(1)
  }
  // Run the model and capture output in the model directory.
  let outputPathname
  if (opts.outfile) {
    outputPathname = opts.outfile
  } else {
    outputPathname = path.join(outputDirname, `${modelName}.txt`)
  }
  let exitCode = execCmd(`${modelCmd} >${outputPathname}`)
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
  exec
}
