import { generateCode, parseModel, preprocessModel } from '@sdeverywhere/compile'

import { modelPathProps, parseSpec } from './utils.js'

let command = 'causes [options] <model> <c_varname>'
let describe = 'print dependencies for a C variable name'
let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  }
}
let handler = argv => {
  causes(argv.model, argv.c_varname, argv)
}
let causes = (model, varname, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelPathname } = modelPathProps(model)
  let extData = new Map()
  let directData = new Map()
  let spec = parseSpec(opts.spec)
  // Preprocess model text into parser input.
  let input = preprocessModel(modelPathname, spec)
  // Parse the model to get variable and subscript information.
  let parseTree = parseModel(input)
  let operations = ['printRefGraph']
  generateCode(parseTree, { spec, operations, extData, directData, modelDirname, varname })
}
export default {
  command,
  describe,
  builder,
  handler
}
