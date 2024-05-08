import { generateC, parseModel, preprocessModel } from '@sdeverywhere/compile'

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
  // TODO: The legacy `parseModel` function previously required the `preprocessModel`
  // step to be performed first, but the new `parseModel` runs the preprocessor
  // implicitly, so we can remove this step (and can simplify this code to use
  // `parseAndGenerate` instead)
  let input = preprocessModel(modelPathname, spec)
  // Parse the model to get variable and subscript information.
  let parsedModel = parseModel(input, modelDirname)
  let operations = ['printRefGraph']
  generateC(parsedModel, { spec, operations, extData, directData, modelDirname, varname })
}
export default {
  command,
  describe,
  builder,
  handler
}
