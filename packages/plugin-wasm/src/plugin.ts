// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'

import { basename, dirname, join as joinPath } from 'path'

import { findUp } from 'find-up'

import type { BuildContext, ModelSpec, Plugin } from '@sdeverywhere/build'

import type { WasmPluginOptions } from './options'
import { sdeNameForVensimVarName } from './var-names'

export function wasmPlugin(options?: WasmPluginOptions): Plugin {
  return new WasmPlugin(options)
}

class WasmPlugin implements Plugin {
  constructor(private readonly options?: WasmPluginOptions) {}

  async preGenerate(context: BuildContext, modelSpec: ModelSpec): Promise<void> {
    // Ensure that the build directory exists before we generate a file into it
    const buildDir = joinPath(context.config.prepDir, 'build')
    if (!existsSync(buildDir)) {
      mkdirSync(buildDir, { recursive: true })
    }

    // Write a file that will be folded into the generated Wasm module
    const preJsFile = joinPath(buildDir, 'processed_extras.js')
    const outputVarIds = modelSpec.outputs.map(o => sdeNameForVensimVarName(o.varName))
    const content = `\
Module["kind"] = "wasm";
Module["outputVarIds"] = ${JSON.stringify(outputVarIds)};
`
    await writeFile(preJsFile, content)
  }

  async postGenerateCode(context: BuildContext, format: 'js' | 'c', content: string): Promise<string> {
    if (format !== 'c') {
      throw new Error("When using plugin-wasm, you must set `genFormat` to 'c' in your `sde.config.js` file")
    }

    context.log('info', '  Generating WebAssembly module')

    // If `outputJsPath` is undefined, write `generated-model.js` to the prep dir
    const stagedOutputJsFile = 'generated-model.js'
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
    await buildWasm(context, context.config.prepDir, stagedOutputJsPath, this.options)

    // context.log('info', '  Done!')

    return content
  }
}

/**
 * Generate a JS file (containing an embedded Wasm blob) from the C file.
 */
async function buildWasm(
  context: BuildContext,
  prepDir: string,
  outputJsPath: string,
  options?: WasmPluginOptions
): Promise<void> {
  // Locate the Emscripten SDK directory
  let emsdkDir: string
  if (options?.emsdkDir) {
    // Try the configured directory
    if (typeof options.emsdkDir === 'function') {
      emsdkDir = options.emsdkDir()
    } else {
      emsdkDir = options.emsdkDir
    }
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
  addArg('--pre-js')
  addArg('build/processed_extras.js')
  addArg('-Ibuild')
  addArg('-o')
  addArg(outputJsPath)
  if (options?.emccArgs !== undefined) {
    let argsArray: string[]
    if (typeof options.emccArgs === 'function') {
      argsArray = options.emccArgs()
    } else {
      argsArray = options.emccArgs
    }
    argsArray.forEach(addArg)
  } else {
    addArg('-Wall')
    addArg('-Os')
    addFlag('STRICT=1')
    addFlag('MALLOC=emmalloc')
    addFlag('FILESYSTEM=0')
    addFlag('MODULARIZE=1')
    addFlag('SINGLE_FILE=1')
    addFlag('EXPORT_ES6=1')
    addFlag('USE_ES6_IMPORT_META=0')
    // Note: The following argument is used to override the default list of supported environments.
    // The problem is that the default list includes "node", but we can't use `USE_ES6_IMPORT_META=0`
    // if "node" is included in the list.  We want `USE_ES6_IMPORT_META=0` because using 1 causes
    // problems with our init code since we also use `SINGLE_FILE=1` (inlined wasm).  The bottom
    // line is that if we omit "node" from this list, the wasm will still work fine in both browser
    // and Node.js contexts (tested in Emscripten 2.0.34 and 3.1.46).
    addFlag(`ENVIRONMENT='web,webview,worker'`)
    addFlag(
      `EXPORTED_FUNCTIONS=['_malloc','_free','_getMaxOutputIndices','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']`
    )
    addFlag(`EXPORTED_RUNTIME_METHODS=['cwrap']`)
  }

  // context.log('verbose', `    emcc args: ${args}`)

  const emccOutput = await context.spawnChild(prepDir, command, args, {
    // Ignore unhelpful Emscripten SDK cache messages
    ignoredMessageFilter: 'cache:INFO',
    // The default error message from `spawnChild` is not very informative, so the
    // following allows us to throw our own error
    ignoreError: true
  })
  if (emccOutput.exitCode !== 0) {
    throw new Error(`Failed to compile C model to WebAssembly: emcc command failed (code=${emccOutput.exitCode})`)
  }
}
