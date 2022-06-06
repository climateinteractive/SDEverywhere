import path from 'path'
import B from 'bufx'

import { canonicalName, preprocessModel } from '@sdeverywhere/compile'

import { buildDir, modelPathProps } from './utils.js'

export let command = 'generate [options] <model>'
export let describe = 'generate model code'
export let builder = {
  genc: {
    describe: 'generate C code for the model',
    type: 'boolean'
  },
  list: {
    describe: 'list model variables',
    type: 'boolean',
    alias: 'l'
  },
  preprocess: {
    describe: 'write a preprocessed model that runs in Vensim',
    type: 'boolean',
    alias: 'p'
  },
  analysis: {
    describe: 'write a nonexecutable preprocessed model for analysis',
    type: 'boolean',
    alias: 'a'
  },
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
  refidtest: {
    describe: 'test reference ids',
    type: 'boolean',
    alias: 'r'
  }
}
export let handler = argv => {
  generate(argv.model, argv)
}

export let generate = async (model, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  // Preprocess model text into parser input. Stop now if that's all we're doing.
  let spec = parseSpec(opts.spec)
  // Produce a runnable model with the "genc" and "preprocess" options.
  let profile = opts.analysis ? 'analysis' : 'genc'
  // Write the preprocessed model and removals if the option is "analysis" or "preprocess".
  let writeFiles = opts.analysis || opts.preprocess
  let input = preprocessModel(modelPathname, spec, profile, writeFiles)
  if (writeFiles) {
    let outputPathname = path.join(buildDirname, `${modelName}.mdl`)
    writeOutput(outputPathname, input)
    process.exit(0)
  }
  // Parse the model and generate code. If no operation is specified, the code generator will
  // read the model and do nothing else. This is required for the list operation.
  let operation = ''
  if (opts.genc) {
    operation = 'generateC'
  } else if (opts.list) {
    operation = 'printVarList'
  } else if (opts.refidtest) {
    operation = 'printRefIdTest'
  }
  parseAndGenerate(spec, operation, modelDirname)
}
let parseSpec = specFilename => {
  let spec = parseJsonFile(specFilename)
  // Translate dimension families in the spec to canonical form.
  if (spec.dimensionFamilies) {
    let f = {}
    for (let dimName in spec.dimensionFamilies) {
      let family = spec.dimensionFamilies[dimName]
      f[canonicalName(dimName)] = canonicalName(family)
    }
    spec.dimensionFamilies = f
  }
  return spec
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
  handler,
  generate
}
