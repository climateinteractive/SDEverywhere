import path from 'path'
import { readFileSync } from 'fs'
import B from 'bufx'

import { parseAndGenerate, preprocessVensimModel } from '@sdeverywhere/compile'

import { buildDir, modelPathProps, parseSpec } from './utils.js'

export let command = 'generate [options] <model>'
export let describe = 'generate model code'
export let builder = {
  // TODO: The old `--genc` option is deprecated and replaced by `--outformat=c`
  genc: {
    describe: 'generate C code for the model',
    type: 'boolean',
    hidden: true
  },
  outformat: {
    describe: 'write generated code in the given format',
    choices: ['js', 'c']
  },
  list: {
    describe: 'write a file that lists model variables',
    type: 'boolean',
    alias: 'l'
  },
  preprocess: {
    describe: 'write a preprocessed model that runs in Vensim',
    type: 'boolean',
    alias: 'p'
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
export let handler = async argv => {
  try {
    await generate(argv.model, argv)
  } catch (e) {
    console.error(e)
    console.error()
    process.exit(1)
  }
}

export let generate = async (model, opts) => {
  // Get the model name and directory from the model argument.
  let { modelDirname, modelName, modelPathname } = modelPathProps(model)
  // Ensure the build directory exists.
  let buildDirname = buildDir(opts.builddir, modelDirname)
  let spec = parseSpec(opts.spec)
  let mdlContent = readFileSync(modelPathname, 'utf8')
  if (opts.preprocess) {
    // Only run the preprocessor.
    let preprocessed = preprocessModel(mdlContent)
    let outputPathname = path.join(buildDirname, `${modelName}.mdl`)
    B.write(preprocessed, outputPathname)
    process.exit(0)
  }
  // Parse the model and generate code. If no operation is specified, the code generator will
  // read the model and do nothing else. This is required for the list operation.
  let operations = []
  if (opts.outformat === 'js') {
    operations.push('generateJS')
  }
  if (opts.genc || opts.outformat === 'c') {
    if (opts.genc) {
      console.warn(`WARNING: --genc option is deprecated for the 'sde generate' command; use --outformat=c instead`)
    }
    operations.push('generateC')
  }
  if (opts.list) {
    operations.push('printVarList')
  }
  if (opts.refidtest) {
    operations.push('printRefIdTest')
  }
  await parseAndGenerate(mdlContent, spec, operations, modelDirname, modelName, buildDirname)
}

export default {
  command,
  describe,
  builder,
  handler,
  generate
}

/**
 * Read and preprocess the given Vensim model content.
 *
 * @param {string} mdlContent The mdl content.
 * @return {string} The preprocessed mdl text.
 */
function preprocessModel(mdlContent) {
  // Run the preprocessor
  const { defs } = preprocessVensimModel(mdlContent)

  // Join the preprocessed definitions into a single string
  let text = '{UTF-8}\n\n'
  for (const def of defs) {
    text += `${def.def}\n\n`
  }

  return text
}
