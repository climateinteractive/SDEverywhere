const path = require('path')
const { run } = require('./sde-run')
const { log } = require('./sde-log')
const { compare } = require('./sde-compare')
const { modelPathProps, outputDir } = require('./Helpers')

let command = 'test [options] <model>'
let describe = 'build the model, run it, process the log, and compare to Vensim data'
let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  outfile: {
    describe: 'output pathname',
    type: 'string',
    alias: 'o'
  },
  precision: {
    describe: 'precision to which values must agree (default 1e-5)',
    type: 'number',
    alias: 'p'
  }
}
let handler = argv => {
  test(argv.model, argv)
}
let test = async (model, opts) => {
  // Run the model and save output to an SDE log file.
  let { modelDirname, modelName } = modelPathProps(model)
  let logPathname
  if (opts.outfile) {
    logPathname = opts.outfile
  } else {
    let outputDirname = outputDir(opts.outfile, modelDirname)
    logPathname = path.join(outputDirname, `${modelName}.txt`)
    opts.outfile = logPathname
  }
  run(model, opts)
  // Convert the TSV log file to a DAT file in the same directory.
  opts.dat = true
  await log(logPathname, opts)
  // Assume there is a Vensim-created DAT file named {modelName}.dat in the model directory.
  // Compare it to the SDE DAT file.
  let vensimPathname = path.join(modelDirname, `${modelName}.dat`)
  let p = path.parse(logPathname)
  let sdePathname = path.format({ dir: p.dir, name: p.name, ext: '.dat' })
  compare(vensimPathname, sdePathname, opts)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  test
}
