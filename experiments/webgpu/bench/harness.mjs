// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Shared benchmark harness: build cases (model -> wasm + production JS + flat JS + WGSL) and
// run each case in its own freshly created headless Chrome page.
//

import http from 'node:http'
import { appendFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { generateCode, parseModel, resetState } from '../../../packages/compile/src/index.js'

import { buildWasmModel } from '../src/build-wasm.mjs'
import { compileModel } from '../src/compile.mjs'

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Build one benchmark case from a model source.
 *
 * @param {Object} opts The case options.
 * @return {Object} The case, ready to serialize to the browser.
 */
export function buildCase({
  label,
  mdlText,
  outputVarNames,
  inputVarNames = [],
  inputValues = [1],
  numRuns,
  reps,
  strategies,
  meta,
  modelDir,
  prodBaseline = true,
  wasmBaseline = true,
  wasmInitialMemoryMB,
  referenceOnly = false
}) {
  const compiled = compileModel({ mdlText, outputVarNames, inputVarNames, numRuns, modelDir })

  // Also generate a model with SDE's production JS code generator, so that the benchmark
  // reports against the backend that exists today rather than only against the prototype's
  // own CPU path.  Code generation for very wide models is slow, so it is opt-out.
  let prodJsCode
  if (prodBaseline) {
    resetState()
    const parsed = parseModel(mdlText, 'vensim', modelDir)
    const code = generateCode(parsed, {
      spec: { outputVarNames, inputVarNames },
      operations: ['generateJS'],
      extData: new Map(),
      directData: new Map(),
      modelDirname: modelDir
    })
    prodJsCode = code.replace(/\/\*export\*\//g, 'export')
  }

  // Build the WebAssembly model the way `plugin-wasm` does, but with -O3 rather than the
  // plugin's default -Os
  let wasmJsCode
  if (wasmBaseline) {
    wasmJsCode = buildWasmModel({
      mdlText,
      outputVarNames,
      inputVarNames,
      modelDir,
      optLevel: '-O3',
      initialMemoryMB: wasmInitialMemoryMB
    })
  }
  return {
    label,
    meta: {
      ...meta,
      numRuns,
      numCells: compiled.ir.numCells,
      numInstrs: compiled.wgsl.numInstrs,
      auxLayers: compiled.wgsl.stats.layerCounts.evalAux,
      levelLayers: compiled.wgsl.stats.layerCounts.evalLevels,
      numSteps: compiled.wgsl.numSteps,
      savePointCount: compiled.wgsl.savePointCount,
      numOutputs: compiled.outputCells.length,
      wgslBytes: compiled.wgsl.code.length
    },
    jsCode: compiled.js.code,
    prodJsCode,
    wasmJsCode,
    wgslCode: compiled.wgsl.code,
    table: Array.from(compiled.wgsl.table),
    lookupDir: Array.from(compiled.lookupDir),
    lookupData: Array.from(compiled.ir.lookupDataF64),
    plan: compiled.wgsl.plan,
    numCells: compiled.ir.numCells,
    numRuns,
    numOutputs: compiled.outputCells.length,
    numInputs: compiled.inputCells.length,
    inputValues,
    savePointCount: compiled.wgsl.savePointCount,
    numSteps: compiled.wgsl.numSteps,
    stepsPerSave: compiled.wgsl.stepsPerSave,
    reps,
    strategies,
    referenceOnly
  }
}

/**
 * Serve the benchmark cases and run each one in its own freshly created page.
 *
 * Each case gets a new page (and a new WebGPU device) because a single long-lived page
 * accumulates dozens of large generated functions, and V8's optimization decisions for a
 * given model then depend on what ran before it.  Measured JS baselines drifted by ~3x
 * across a shared page, which is larger than several of the effects being measured.
 *
 * @param {Object[]} cases The benchmark cases.
 * @return {Promise<Object>} The collected results.
 */
export async function runInBrowser(cases) {
  const server = http.createServer((req, res) => {
    const [url, query] = req.url.split('?')
    if (url === '/cases.json') {
      const index = parseInt(new URLSearchParams(query).get('i'), 10)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify([cases[index]]))
      return
    }
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(
        '<!doctype html><meta charset=utf-8><title>bench</title><script type="module" src="/bench-page.js"></script>'
      )
      return
    }
    if (url === '/runtime.js') {
      // Serve the runtime package's ESM bundle to the page.  Its only external import is
      // `neverthrow`, which none of the model-function code paths touch, so a tiny local
      // shim keeps the bundle self-contained.
      const runtimePath = join(here, '../../packages/runtime/dist/index.js')
      const src = readFileSync(runtimePath, 'utf8').replace(
        /^import \{ ok, err \} from "neverthrow";$/m,
        'const ok = v => ({ isOk: () => true, value: v });\nconst err = e => ({ isOk: () => false, error: e });'
      )
      res.writeHead(200, { 'content-type': 'text/javascript' })
      res.end(src)
      return
    }
    const file = join(here, 'bench', url.replace(/^\//, ''))
    if (existsSync(file)) {
      res.writeHead(200, { 'content-type': 'text/javascript' })
      res.end(readFileSync(file))
      return
    }
    res.writeHead(404)
    res.end('not found')
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}/`

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-unsafe-webgpu', '--use-angle=metal']
  })
  const results = []
  let adapter = {}
  try {
    for (let i = 0; i < cases.length; i++) {
      const page = await browser.newPage()
      if (process.env.VERBOSE) {
        page.on('console', m => console.log('   ', m.text()))
      }
      await page.goto(`${base}?i=${i}`)
      await page.waitForFunction(() => window.__benchResults !== undefined, null, { timeout: 900000 })
      const out = await page.evaluate(() => window.__benchResults)
      await page.close()
      if (out.error) {
        results.push({ label: cases[i].label, meta: cases[i].meta, error: out.error })
      } else {
        adapter = out.adapter
        results.push(...out.results)
      }
      const r = results[results.length - 1]
      console.log(`  [${i + 1}/${cases.length}] ${r.label}${r.error ? ` ERROR: ${r.error}` : ''}`)
      // Persist each result as it arrives, so a failure late in a long sweep does not throw
      // away the cases that already succeeded
      if (process.env.BENCH_JSON) {
        appendFileSync(process.env.BENCH_JSON, `${JSON.stringify(r)}\n`)
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  return { adapter, results }
}
