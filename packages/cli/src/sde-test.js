import path from 'path'

import { run } from './sde-run.js'
import { log } from './sde-log.js'
import { compare } from './sde-compare.js'
import { modelPathProps, outputDir } from './utils.js'

export let command = 'test [options] <model>'
export let describe = 'build the model, run it, process the log, and compare to Vensim data'
export let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  genformat: {
    describe: 'generated code format',
    choices: ['js', 'c'],
    default: 'js'
  },
  tooldat: {
    describe: 'pathname of the tool DAT file to compare to SDE output',
    type: 'string'
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
  try {
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
    let toolDatPathname
    if (opts.tooldat) {
      // Use the provided DAT file for comparison
      toolDatPathname = opts.tooldat
    } else {
      // Assume there is a DAT file created by the modeling tool named {modelName}.dat
      // in the model directory
      toolDatPathname = path.join(modelDirname, `${modelName}.dat`)
    }
    let p = path.parse(logPathname)
    let sdeDatPathname = path.format({ dir: p.dir, name: p.name, ext: '.dat' })
    // Compare SDE-generated DAT file to the tool-generated DAT file
    let noDiffs = await compare(toolDatPathname, sdeDatPathname, opts)
    if (!noDiffs) {
      // Exit with a non-zero error code if differences were detected
      console.error()
      process.exit(1)
    }
  } catch (e) {
    // Exit with a non-zero error code if any step failed
    console.error(e)
    console.error()
    process.exit(1)
  }
}

export default {
  command,
  describe,
  builder,
  handler,
  test
}
