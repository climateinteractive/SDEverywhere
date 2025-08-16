import { writeFileSync } from 'fs'
import { resolve } from 'path'

import { generate } from './sde-generate.js'
import { compile } from './sde-compile.js'

import { buildDir, modelPathProps } from './utils.js'

export let command = 'build [options] <model>'
export let describe = 'generate model code and compile it'
export let builder = {
  spec: {
    describe: 'pathname of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  genformat: {
    describe: 'generated code format',
    choices: ['js', 'c'],
    default: 'js'
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
  try {
    // Generate code in JS or C format
    opts.outformat = opts.genformat || 'js'
    await generate(model, opts)
    if (opts.outformat === 'js') {
      // Write a `main.js` file that can be used by `sde exec` to execute the model
      // on the command line using Node.js
      writeMainJs(model, opts)
    } else if (opts.outformat === 'c') {
      // Compile the generated C code to a native executable
      compile(model, opts)
    }
  } catch (e) {
    // Exit with a non-zero error code if any step failed
    console.error(e)
    console.error()
    process.exit(1)
  }
}

export default {
  command,
  describe,
  builder,
  handler,
  build
}

/**
 * Write a minimal `main.js` file that can be used by `sde exec` to execute a
 * generated JS model.
 */
let writeMainJs = (model, opts) => {
  let { modelDirname, modelName } = modelPathProps(model)
  let buildDirname = buildDir(opts.builddir, modelDirname)
  const mainJsFile = resolve(buildDirname, 'main.js')
  let mainJs = ''
  mainJs += '#!/usr/bin/env node\n'
  mainJs += `import { execJsModel } from '@sdeverywhere/runtime'\n`
  mainJs += `import loadJsModel from './${modelName}.js'\n`
  mainJs += 'execJsModel(await loadJsModel())\n'
  writeFileSync(mainJsFile, mainJs, { mode: 0o755 })
}
