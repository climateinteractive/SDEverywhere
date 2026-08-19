// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Benchmark harness.
//
// Compiles a set of model shapes to WebAssembly, JavaScript, and WGSL, then reports
// wall-clock times for:
//
//   wasm-O3      SDE's production C backend compiled with Emscripten -O3 - the fastest
//                backend SDEverywhere ships today
//   sde-js       SDE's production JS backend
//   flat-f64     the prototype's flat-buffer JS model (double precision)
//   layered      WebGPU, one dispatch per dependency layer per time step
//   perWorkgroup WebGPU, one workgroup per run, barriers between layers
//   perThread    WebGPU, one thread per model run, whole simulation in one dispatch
//
// All of these run in the same headless Chrome instance so that they share one JS engine
// and one set of JIT heuristics.
//

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCase, runInBrowser } from './bench/harness.mjs'
import { wideModel, scalarModel } from './bench/synth-models.mjs'

const here = dirname(fileURLToPath(import.meta.url))

//
// Case definitions
//

const cases = []
const ALL = ['layered', 'perThread', 'perWorkgroup']

/**
 * Choose the strategies to measure for a case.
 *
 * `perWorkgroup` launches a full 256-thread workgroup per run, so for large ensembles of
 * narrow models it wastes most of its lanes and takes far longer than the alternatives;
 * skip it there rather than let it dominate the sweep.
 *
 * @param {number} numRuns The ensemble size.
 * @return {string[]} The strategies to measure.
 */
const strategiesFor = numRuns => (numRuns > 4096 ? ['layered', 'perThread'] : ALL)

// 1. Shape sweep for a single run: how wide does a model have to be before the GPU wins?
for (const width of [1, 10, 100, 1000, 10000, 100000]) {
  cases.push(
    buildCase({
      label: `wide w=${width} d=8 t=200 runs=1`,
      mdlText: wideModel({ width, depth: 8, finalTime: 200 }),
      outputVarNames: ['total'],
      prodBaseline: width <= 1000,
      wasmBaseline: width <= 1000,
      numRuns: 1,
      reps: 5,
      strategies: ALL,
      meta: { family: 'width-sweep', width, depth: 8, steps: 200 }
    })
  )
}

// 2. Ensemble sweep for a narrow model: the Monte Carlo / optimization use case
for (const numRuns of [1, 16, 64, 256, 1024, 4096, 16384, 65536]) {
  cases.push(
    buildCase({
      label: `ensemble w=10 d=8 t=200 runs=${numRuns}`,
      mdlText: wideModel({ width: 10, depth: 8, finalTime: 200 }),
      outputVarNames: ['total'],
      inputVarNames: ['growth'],
      inputValues: [0.5, 1, 1.5, 2],
      numRuns,
      reps: 3,
      strategies: strategiesFor(numRuns),
      meta: { family: 'ensemble', width: 10, depth: 8, steps: 200 }
    })
  )
}

// 3. Depth sweep: serial dependency chains are the GPU's worst case
for (const depth of [2, 8, 32]) {
  cases.push(
    buildCase({
      label: `depth d=${depth} w=1000 t=200 runs=1`,
      mdlText: wideModel({ width: 1000, depth, finalTime: 200 }),
      outputVarNames: ['total'],
      numRuns: 1,
      reps: 3,
      strategies: ALL,
      meta: { family: 'depth-sweep', width: 1000, depth, steps: 200 }
    })
  )
}

// 4. A conventional scalar-heavy model (the common case in existing SD models)
for (const numRuns of [1, 1024]) {
  cases.push(
    buildCase({
      label: `scalar 400vars d=20 t=200 runs=${numRuns}`,
      mdlText: scalarModel({ numVars: 400, depth: 20, finalTime: 200 }),
      outputVarNames: ['stock'],
      numRuns,
      reps: 3,
      strategies: strategiesFor(numRuns),
      meta: { family: 'scalar', numVars: 400, depth: 20, steps: 200 }
    })
  )
}

// 5. Wide model with a modest ensemble: the "vectorized model, parameter sweep" case
for (const numRuns of [1, 16, 64]) {
  cases.push(
    buildCase({
      label: `wide+ens w=1000 d=8 t=200 runs=${numRuns}`,
      mdlText: wideModel({ width: 1000, depth: 8, finalTime: 200 }),
      outputVarNames: ['total'],
      inputVarNames: ['growth'],
      inputValues: [0.5, 1, 1.5, 2],
      numRuns,
      reps: 3,
      strategies: ALL,
      meta: { family: 'wide-ensemble', width: 1000, depth: 8, steps: 200 }
    })
  )
}

// 6. Long time horizon (many small steps), as used by models with a fine time step
cases.push(
  buildCase({
    label: 'long t=2000 w=1000 d=8 runs=1',
    mdlText: wideModel({ width: 1000, depth: 8, finalTime: 2000 }),
    outputVarNames: ['total'],
    numRuns: 1,
    reps: 3,
    strategies: ALL,
    meta: { family: 'long-horizon', width: 1000, depth: 8, steps: 2000 }
  })
)

// 7. A real model from the `models` directory, for sanity
const sirPath = resolve(here, '../../models/sir/sir.mdl')
for (const numRuns of [1, 1024, 16384]) {
  cases.push(
    buildCase({
      label: `sir runs=${numRuns}`,
      mdlText: readFileSync(sirPath, 'utf8'),
      modelDir: dirname(sirPath),
      outputVarNames: ['Susceptible Population S', 'Infectious Population I', 'Recovered Population R'],
      inputVarNames: ['Initial Contact Rate'],
      inputValues: [2.0, 2.5, 3.0, 3.5],
      numRuns,
      reps: 3,
      strategies: strategiesFor(numRuns),
      meta: { family: 'real-model', model: 'sir' }
    })
  )
}

const filter = process.env.ONLY
const selected = filter ? cases.filter(c => c.label.includes(filter)) : cases

console.log(`Running ${selected.length} cases...`)
const out = await runInBrowser(selected)

if (out.error) {
  console.error(`ERROR: ${out.error}`)
  process.exit(1)
}

console.log(`\nAdapter: ${JSON.stringify(out.adapter)}\n`)
const pad = (s, n) => String(s).padEnd(n)
const num = (v, n = 9) => (v === undefined ? '-' : v.toFixed(2)).padStart(n)

console.log(
  `${pad('case', 34)}${pad('cells', 8)}${pad('instr', 7)}${pad('lyr', 5)}` +
    `${'wasm-O3'.padStart(9)}${'sde-js'.padStart(9)}${'flat-f64'.padStart(9)}${'layered'.padStart(9)}${'perThr'.padStart(9)}${'perWG'.padStart(9)}` +
    `${'vs wasm'.padStart(8)}${'  gpu maxRel'}`
)
for (const r of out.results) {
  if (r.error) {
    console.log(`${pad(r.label, 34)}ERROR ${r.error}`)
    continue
  }
  const layered = r.layered?.totalMs
  const perThread = r.perThread?.totalMs
  const perWorkgroup = r.perWorkgroup?.totalMs
  const bestGpu = Math.min(layered ?? Infinity, perThread ?? Infinity, perWorkgroup ?? Infinity)
  const speedup = (r.wasmMs ?? r.prodJsMs ?? r.jsF64Ms) / bestGpu
  const maxRel = Math.max(r.layered?.maxRel ?? 0, r.perThread?.maxRel ?? 0, r.perWorkgroup?.maxRel ?? 0)
  console.log(
    `${pad(r.label, 34)}${pad(r.meta.numCells, 8)}${pad(r.meta.numInstrs, 7)}${pad(r.meta.auxLayers, 5)}` +
      `${num(r.wasmMs)}${num(r.prodJsMs)}${num(r.jsF64Ms)}${num(layered)}${num(perThread)}${num(perWorkgroup)}` +
      `${(speedup >= 1 ? speedup.toFixed(1) + 'x' : '(' + (1 / speedup).toFixed(1) + 'x)').padStart(8)}` +
      `  ${maxRel.toExponential(2)}`
  )
}

console.log('\nDetail (GPU encode vs execute, dispatch counts):')
for (const r of out.results) {
  if (r.error) continue
  console.log(
    `  ${pad(r.label, 34)} layered: encode=${num(r.layered?.encodeMs, 7)} gpu=${num(r.layered?.gpuMs, 7)} ` +
      `dispatches=${r.dispatchCounts?.layered}  |  perThread=${num(r.perThread?.gpuMs, 7)} perWG=${num(r.perWorkgroup?.gpuMs, 7)}` +
      `  |  best+readback=${num(Math.min(r.layered?.withReadbackMs ?? Infinity, r.perThread?.withReadbackMs ?? Infinity, r.perWorkgroup?.withReadbackMs ?? Infinity), 8)}`
  )
}
