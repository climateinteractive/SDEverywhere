import path from 'path'
import { run } from './sde-run.js'
import { log } from './sde-log.js'
import { compare } from './sde-compare.js'
import { modelPathProps, outputDir } from './Helpers.js'

export let command = 'test [options] <model>'
export let describe = 'build the model, run it, process the log, and compare to Vensim data'
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
export let handler = argv => {
  test(argv.model, argv)
}
export let test = async (model, opts) => {
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
  await run(model, opts)
  // Convert the TSV log file to a DAT file in the same directory.
  opts.dat = true
  await log(logPathname, opts)
  // Assume there is a Vensim-created DAT file named {modelName}.dat in the model directory.
  // Compare it to the SDE DAT file.
  let vensimPathname = path.join(modelDirname, `${modelName}.dat`)
  let p = path.parse(logPathname)
  let sdePathname = path.format({ dir: p.dir, name: p.name, ext: '.dat' })
  await compare(vensimPathname, sdePathname, opts)
}

export default {
  command,
  describe,
  builder,
  handler,
  test
}
