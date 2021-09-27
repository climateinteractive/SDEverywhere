import path from 'path'
import moment from 'moment'
import { modelPathProps, buildDir, outputDir, execCmd, fileExists } from './Helpers.js'

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
  // Run the model and capture output in the model directory.
  let modelCmd = `${buildDirname}/${modelName}`
  let outputPathname
  if (opts.outfile) {
    outputPathname = opts.outfile
  } else {
    outputPathname = path.join(outputDirname, `${modelName}.txt`)
  }
  let exitCode = execCmd(`${modelCmd} >${outputPathname}`)
  if (exitCode > 0) {
    process.exit(exitCode)
  } else if (!fileExists(outputPathname)) {
    console.error(`ERROR: Failed to write model output to ${outputPathname}`)
    process.exit(1)
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
