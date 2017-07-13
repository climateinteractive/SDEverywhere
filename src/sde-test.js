const path = require('path')
const { run } = require('./sde-run')
const { log } = require('./sde-log')
const { compare } = require('./sde-compare')
const { modelPathProps } = require('./Helpers')

let command = 'test <model>'
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
  }
}
let handler = argv => {
  test(argv.model, argv)
}
let test = (model, opts) => {
  // Run the model and save output to an SDE log file.
  const LOG_BASENAME = 'sde'
  let { modelDirname, modelName } = modelPathProps(model)
  let logPathname
  if (opts.outfile) {
    logPathname = opts.outfile
  } else {
    logPathname = path.join(modelDirname, `${LOG_BASENAME}.txt`)
    opts.outfile = logPathname
  }
  run(model, opts)
  // Convert the TSV log file to a DAT file in the same directory.
  opts.dat = true
  log(logPathname, opts)
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
