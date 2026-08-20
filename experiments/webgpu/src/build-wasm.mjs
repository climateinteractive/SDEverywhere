// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Build a WebAssembly model the way SDEverywhere normally does: generate C with the
// production C code generator, then compile it with Emscripten.
//
// This exists so that the benchmark can compare WebGPU against the fastest backend
// SDEverywhere actually ships, not just against the JS backend.
//

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateCode, parseModel, resetState } from '../../../packages/compile/src/index.js'

const here = dirname(fileURLToPath(import.meta.url))

/** The C support files that the generated model is compiled against. */
const C_SUPPORT_FILES = ['model.c', 'macros.c', 'vensim.c', 'allocation.c']
const C_HEADER_FILES = ['model.h', 'macros.h', 'vensim.h', 'sde.h']

/**
 * Locate the Emscripten compiler.
 *
 * @return {string} The absolute path to `emcc`.
 */
function findEmcc() {
  const fromEnv = process.env.EMSDK_DIR
  const candidates = [
    fromEnv && join(fromEnv, 'upstream/emscripten/emcc'),
    resolve(here, '../../../../emsdk/upstream/emscripten/emcc'),
    join(process.env.HOME || '', 'emsdk/upstream/emscripten/emcc')
  ].filter(Boolean)
  for (const c of candidates) {
    if (existsSync(c)) {
      return c
    }
  }
  throw new Error(`Could not find emcc; set EMSDK_DIR (looked in: ${candidates.join(', ')})`)
}

/**
 * Generate C for the given model, compile it to WebAssembly with Emscripten, and return
 * the resulting single-file ES module.
 *
 * Results are cached in `experiments/webgpu/.wasm-cache` keyed by a hash of the model text
 * and the compiler flags, since an `emcc` invocation takes several seconds.
 *
 * @param {Object} opts The build options.
 * @param {string} opts.mdlText The Vensim model text.
 * @param {string[]} opts.outputVarNames The Vensim names of the output variables.
 * @param {string[]} [opts.inputVarNames] The Vensim names of the input variables.
 * @param {string} [opts.modelDir] The directory used to resolve external data files.
 * @param {string} [opts.optLevel] The optimization level to pass to `emcc`.
 * @param {number} [opts.initialMemoryMB] The initial wasm heap size.  A model whose globals
 * exceed the default 16 MB will not link without this.
 * @return {string} The generated JavaScript module text (with the wasm binary inlined).
 */
export function buildWasmModel({
  mdlText,
  outputVarNames,
  inputVarNames = [],
  modelDir,
  optLevel = '-O3',
  initialMemoryMB = 16
}) {
  const key = createHash('sha256')
    .update(mdlText)
    .update(JSON.stringify({ outputVarNames, inputVarNames, optLevel, initialMemoryMB }))
    .digest('hex')
    .slice(0, 16)
  const cacheDir = resolve(here, '../.wasm-cache')
  mkdirSync(cacheDir, { recursive: true })
  const cachedJs = join(cacheDir, `${key}.js`)
  if (existsSync(cachedJs)) {
    return readFileSync(cachedJs, 'utf8')
  }

  // Generate the C source with SDE's production C code generator
  resetState()
  const parsed = parseModel(mdlText, 'vensim', modelDir)
  const cCode = generateCode(parsed, {
    spec: { outputVarNames, inputVarNames, bundleListing: false },
    operations: ['generateC'],
    extData: new Map(),
    directData: new Map(),
    modelDirname: modelDir
  })

  const workDir = join(cacheDir, key)
  mkdirSync(workDir, { recursive: true })
  writeFileSync(join(workDir, 'processed.c'), cCode)
  const cSrcDir = resolve(here, '../../../packages/cli/src/c')
  for (const f of [...C_SUPPORT_FILES, ...C_HEADER_FILES]) {
    copyFileSync(join(cSrcDir, f), join(workDir, f))
  }

  const outJs = join(workDir, 'model.js')
  const args = [
    ...C_SUPPORT_FILES,
    'processed.c',
    '-o',
    'model.js',
    '-Wall',
    optLevel,
    '-sSTRICT=1',
    '-sMALLOC=emmalloc',
    '-sFILESYSTEM=0',
    '-sMODULARIZE=1',
    '-sSINGLE_FILE=1',
    '-sEXPORT_ES6=1',
    '-sUSE_ES6_IMPORT_META=0',
    // `ALLOW_MEMORY_GROWTH` is needed because an ensemble allocates one output buffer per
    // run up front, which can be far larger than the default 16 MB heap
    '-sALLOW_MEMORY_GROWTH=1',
    `-sINITIAL_MEMORY=${initialMemoryMB * 1024 * 1024}`,
    `-sENVIRONMENT='web,webview,worker'`,
    `-sEXPORTED_FUNCTIONS=['_malloc','_free','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']`,
    `-sEXPORTED_RUNTIME_METHODS=['cwrap']`
  ]
  execFileSync(findEmcc(), args, { cwd: workDir, stdio: 'pipe' })

  const js = readFileSync(outJs, 'utf8')
  writeFileSync(cachedJs, js)
  return js
}
