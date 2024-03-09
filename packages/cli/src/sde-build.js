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
  genfmt: {
    describe: 'generated code format',
    choices: ['c', 'js'],
    default: 'c'
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
    opts.code = opts.genfmt || 'c'
    await generate(model, opts)
    if (opts.code === 'c') {
      compile(model, opts)
    } else if (opts.code === 'js') {
      genMainJs(model, opts)
    }
  } catch (e) {
    // Exit with a non-zero error code if any step failed
    console.error(`ERROR: ${e.message}\n`)
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

let genMainJs = (model, opts) => {
  let { modelDirname, modelName } = modelPathProps(model)
  let buildDirname = buildDir(opts.builddir, modelDirname)
  const mainJsFile = resolve(buildDirname, 'main.js')
  let mainJs = ''
  mainJs += '#!/usr/bin/env node\n'
  mainJs += `import { execModel } from '@sdeverywhere/runtime'\n`
  mainJs += `import * as core from './${modelName}.js'\n`
  mainJs += 'execModel(core)\n'
  writeFileSync(mainJsFile, mainJs, { mode: 0o755 })
}
