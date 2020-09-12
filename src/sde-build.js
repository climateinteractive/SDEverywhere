const { generate } = require('./sde-generate')
const { compile } = require('./sde-compile')

let command = 'build [options] <model>'
let describe = 'generate model code and compile it'
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
  }
}
let handler = argv => {
  build(argv.model, argv)
}
let build = async (model, opts) => {
  opts.genc = true
  await generate(model, opts)
  compile(model, opts)
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  build
}
