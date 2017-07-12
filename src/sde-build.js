const { generate } = require('./sde-generate')
const { compile } = require('./sde-compile')

let command = 'build <model>'
let describe = 'generate model code and compile it'
let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  builddir: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
let handler = argv => {
  build(argv.model, argv)
}
let build = (model, opts) => {
  opts.genc = true
  generate(model, opts)
  compile(model, opts)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  build
}
