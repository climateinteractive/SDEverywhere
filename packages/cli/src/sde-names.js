import { readFileSync } from 'fs'

import { parseAndGenerate, printNames } from '@sdeverywhere/compile'

import { modelPathProps, parseSpec } from './utils.js'

let command = 'names [options] <model> <namesfile>'
let describe = 'convert variable names in a model'
let builder = {
  toc: {
    describe: 'convert a file with Vensim variable names to C names',
    type: 'boolean'
  },
  tovml: {
    describe: 'convert a file with C variable names to Vensim names',
    type: 'boolean'
  },
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  }
}
let handler = argv => {
  names(argv.model, argv.namesfile, argv)
}
let names = async (model, namesPathname, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelPathname, modelName } = modelPathProps(model)
  let spec = parseSpec(opts.spec)
  // Parse the model to get variable and subscript information.
  let input = readFileSync(modelPathname, 'utf8')
  await parseAndGenerate(input, spec, ['convertNames'], modelDirname, modelName, '')
  // Read each variable name from the names file and convert it.
  printNames(namesPathname, opts.toc ? 'to-c' : 'to-vensim')
}
export default {
  command,
  describe,
  builder,
  handler
}
