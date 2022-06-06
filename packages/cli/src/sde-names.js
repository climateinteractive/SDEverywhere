import B from 'bufx'

import { generateCode, parseModel, preprocessModel } from '@sdeverywhere/compile'

import Model from './Model.js'
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
let names = (model, namesPathname, opts) => {
  // Get the model name and directory from the model argument.
  let { modelPathname } = modelPathProps(model)
  let spec = parseSpec(opts.spec)
  // Preprocess model text into parser input.
  let input = preprocessModel(modelPathname, spec)
  // Parse the model to get variable and subscript information.
  let parseTree = parseModel(input)
  let operation = 'convertNames'
  generateCode(parseTree, { spec, operation })
  // Read each variable name from the names file and convert it.
  let lines = B.lines(B.read(namesPathname))
  for (let line of lines) {
    if (line.length > 0) {
      if (opts.toc) {
        B.emitLine(Model.cName(line))
      } else if (opts.tovml) {
        B.emitLine(Model.vensimName(line))
      }
    }
  }
  B.printBuf()
}
export default {
  command,
  describe,
  builder,
  handler
}
