import B from 'bufx'

import { parseModel } from '@sdeverywhere/compile'

import { codeGenerator } from './CodeGen.js'
import { preprocessModel } from './Preprocessor.js'
import { modelPathProps } from './utils.js'

let command = 'causes [options] <model> <C_varname>'
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
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  let extData = new Map()
  let directData = new Map()
  let spec = parseSpec(opts.spec)
  // Preprocess model text into parser input.
  let input = preprocessModel(modelPathname, spec)
  // Parse the model to get variable and subscript information.
  let parseTree = parseModel(input)
  let operation = 'printRefGraph'
  codeGenerator(parseTree, { spec, operation, extData, directData, modelDirname, varname }).generate()
}
let parseSpec = specFilename => {
  return parseJsonFile(specFilename)
}
let parseJsonFile = filename => {
  // Parse the JSON file if it exists.
  let result = {}
  try {
    let json = B.read(filename)
    result = JSON.parse(json)
    // console.error(`loaded ${filename}`);
  } catch (ex) {
    // If the file doesn't exist, return an empty object without complaining.
  }
  return result
}
let writeOutput = (outputPathname, outputText) => {
  try {
    B.write(outputText, outputPathname)
  } catch (e) {
    console.log(outputPathname)
    console.log(e.message)
  }
}
export default {
  command,
  describe,
  builder,
  handler
}
