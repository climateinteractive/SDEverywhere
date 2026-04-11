import { readFileSync } from 'fs'

import { parseAndGenerate } from '@sdeverywhere/compile'

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
let causes = async (model, varname, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelPathname, modelName, modelKind } = modelPathProps(model)
  let spec = parseSpec(opts.spec)
  // Parse the model to get variable and subscript information.
  let input = readFileSync(modelPathname, 'utf8')
  await parseAndGenerate(input, modelKind, spec, ['printRefGraph'], modelDirname, modelName, '', varname)
}
export default {
  command,
  describe,
  builder,
  handler
}
