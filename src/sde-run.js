const { build } = require('./sde-build')
const { exec } = require('./sde-exec')

let command = 'run [options] <model>'
let describe = 'build a model, run it, and capture its output to a file'
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
  run(argv.model, argv)
}
let run = async (model, opts) => {
  await build(model, opts)
  exec(model, opts)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  run
}
