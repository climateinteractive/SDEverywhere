// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { basename, dirname, join as joinPath } from 'path'

import { findUp } from 'find-up'

import type { BuildContext, Plugin } from '@sdeverywhere/build'

import type { WasmPluginOptions } from './options'

export function wasmPlugin(options?: WasmPluginOptions): Plugin {
  return new WasmPlugin(options)
}

class WasmPlugin implements Plugin {
  constructor(private readonly options?: WasmPluginOptions) {}

  async postGenerateC(context: BuildContext, cContent: string): Promise<string> {
    context.log('info', '  Generating WebAssembly module')

    // Locate the Emscripten SDK directory
    let emsdkDir: string
    if (this.options?.emsdkDir) {
      // Try the configured directory
      emsdkDir = this.options.emsdkDir
      if (!existsSync(emsdkDir)) {
        throw new Error(`Invalid emsdk directory '${emsdkDir}'`)
      }
    } else {
      // Walk up the directory structure to find the nearest `emsdk` directory
      emsdkDir = await findUp('emsdk', { type: 'directory' })
      if (emsdkDir === undefined) {
        throw new Error('Could not find emsdk directory')
      }
    }

    // XXX: On Windows, we need to use Windows-specific commands; need to revisit
    const isWin = process.platform === 'win32'
    const emccCmd = isWin ? 'emcc.bat' : 'emcc'
    const emccCmdPath = joinPath(emsdkDir, 'upstream', 'emscripten', emccCmd)

    // If `outputJsPath` is undefined, write `wasm-model.js` to the prep dir
    const stagedOutputJsFile = 'wasm-model.js'
    let outputJsPath: string
    if (this.options?.outputJsPath) {
      outputJsPath = this.options.outputJsPath
    } else {
      outputJsPath = joinPath(context.config.prepDir, stagedOutputJsFile)
    }
    const outputJsDir = dirname(outputJsPath)
    const outputJsFile = basename(outputJsPath)

    // Ensure that the staged directory exists before we build the Wasm model
    // (otherwise emcc will fail) and add a staged file entry
    const stagedOutputJsPath = context.prepareStagedFile('model', stagedOutputJsFile, outputJsDir, outputJsFile)

    // Generate the Wasm binary (wrapped in a JS file)
    await buildWasm(context, emccCmdPath, context.config.prepDir, stagedOutputJsPath)

    // context.log('info', '  Done!')

    return cContent
  }
}

/**
 * Generate a JS file (containing an embedded Wasm blob) from the C file.
 */
async function buildWasm(
  context: BuildContext,
  emccCmdPath: string,
  prepDir: string,
  outputJsPath: string
): Promise<void> {
  // Use Emscripten to compile the C model into a Wasm blob packaged inside
  // an ES6 module.  We use `SINGLE_FILE=1` to include the Wasm directly
  // inside the JS file as a base64-encoded string.  This increases the
  // total file size by about 30%, but having it bundled makes building
  // easier and improves startup time (we don't have make a separate fetch
  // to load it over the network).
  const command = emccCmdPath
  const args: string[] = []
  const addArg = (arg: string) => {
    args.push(arg)
  }
  const addInput = (file: string) => {
    addArg(`build/${file}`)
  }
  const addFlag = (flag: string) => {
    addArg('-s')
    addArg(flag)
  }
  addInput('processed.c')
  addInput('macros.c')
  addInput('model.c')
  addInput('vensim.c')
  addArg('-Ibuild')
  addArg('-o')
  addArg(outputJsPath)
  addArg('-Wall')
  addArg('-Os')
  addFlag('STRICT=1')
  addFlag('MALLOC=emmalloc')
  addFlag('FILESYSTEM=0')
  addFlag('MODULARIZE=1')
  addFlag('SINGLE_FILE=1')
  addFlag('EXPORT_ES6=1')
  addFlag('USE_ES6_IMPORT_META=0')
  addFlag(`EXPORTED_FUNCTIONS=['_malloc','_runModelWithBuffers']`)
  addFlag(`EXPORTED_RUNTIME_METHODS=['cwrap']`)

  await context.spawnChild(prepDir, command, args, {
    // Ignore unhelpful Emscripten SDK cache messages
    ignoredMessageFilter: 'cache:INFO'
  })
}
