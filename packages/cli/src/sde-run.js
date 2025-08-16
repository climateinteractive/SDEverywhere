import { build } from './sde-build.js'
import { exec } from './sde-exec.js'

export let command = 'run [options] <model>'
export let describe = 'build a model, run it, and capture its output to a file'
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
  run(argv.model, argv)
}
export let run = async (model, opts) => {
  await build(model, opts)
  exec(model, opts)
}

export default {
  command,
  describe,
  builder,
  handler,
  run
}
