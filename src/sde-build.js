import { generate } from './sde-generate.js'
import { compile } from './sde-compile.js'

export let command = 'build [options] <model>'
export let describe = 'generate model code and compile it'
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
  }
}
export let handler = argv => {
  build(argv.model, argv)
}
export let build = async (model, opts) => {
  opts.genc = true
  await generate(model, opts)
  compile(model, opts)
}

export default {
  command,
  describe,
  builder,
  handler,
  build
}
