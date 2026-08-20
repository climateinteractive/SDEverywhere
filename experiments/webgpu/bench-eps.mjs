// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Benchmark the case jrissman described in issue #319: a model with the Energy Policy
// Simulator's structure, including the 8760-hours-per-year electricity detail.
//
// The model comes from `bench/eps-shaped-model.mjs`, which reproduces the per-layer
// parallel-width profile measured from the real EPS (eps-us @ 2e3acf8, the revision
// jrissman linked).  See `inspect.mjs` for that measurement.
//
// The question is specifically about a *single* run: "even if we can only accelerate
// operations by parallelizing calculations for non-interacting subscript elements or
// non-interacting variables, that would be enough to allow the EPS to run many times
// faster".  So the main cases here use one run; a small ensemble sweep is included to show
// the other axis.
//

import { buildCase, runInBrowser } from './bench/harness.mjs'
import { epsShapedModel, EPS_LAYER_WIDTHS } from './bench/eps-shaped-model.mjs'

const full = epsShapedModel()
console.log(
  `EPS-shaped model: ${full.varCount} generated variables, ${full.layerCount} dependency layers, ` +
    `${full.totalCellsPerStep.toLocaleString()} cells per time step, 2020-2050 (30 steps)`
)

const cases = []

// The main event: one run of the full-detail model.  `perThread` is excluded because it
// gives one GPU lane the entire model; at this size that takes minutes.
cases.push(
  buildCase({
    label: 'eps 8760h runs=1',
    mdlText: full.mdlText,
    outputVarNames: full.outputVarNames,
    inputVarNames: ['policy lever'],
    numRuns: 1,
    reps: 3,
    strategies: ['layered', 'perWorkgroup'],
    prodBaseline: false,
    referenceOnly: true,
    wasmInitialMemoryMB: 512,
    meta: { family: 'eps', detail: '8760h' }
  })
)

// The same structure at reduced width, to show how the result depends on how much hourly
// detail the model carries.  `widthScale` scales every layer, so 1/24 is roughly the
// "representative timeslices instead of 8760 hours" version the EPS actually ships.
for (const [name, scale] of [
  ['1/24', 1 / 24],
  ['1/8', 1 / 8],
  ['1/2', 1 / 2]
]) {
  const scaled = epsShapedModel({ widthScale: scale })
  cases.push(
    buildCase({
      label: `eps width=${name} runs=1`,
      mdlText: scaled.mdlText,
      outputVarNames: scaled.outputVarNames,
      inputVarNames: ['policy lever'],
      numRuns: 1,
      reps: 3,
      strategies: ['layered', 'perWorkgroup'],
      prodBaseline: false,
      referenceOnly: true,
      wasmInitialMemoryMB: 128,
      meta: { family: 'eps-width', scale }
    })
  )
}

// A small ensemble of the full-detail model.  State alone is ~12 MB per run, so this is
// where an EPS-scale ensemble runs into memory rather than compute limits.  (16 runs was
// also tried and did not complete within a 15 minute budget.)
for (const numRuns of [4]) {
  cases.push(
    buildCase({
      label: `eps 8760h runs=${numRuns}`,
      mdlText: full.mdlText,
      outputVarNames: full.outputVarNames,
      inputVarNames: ['policy lever'],
      inputValues: [0.5, 1, 1.5, 2],
      numRuns,
      reps: 3,
      strategies: ['layered'],
      prodBaseline: false,
      referenceOnly: true,
      wasmInitialMemoryMB: 512,
      meta: { family: 'eps-ensemble', detail: '8760h' }
    })
  )
}

console.log(`Running ${cases.length} cases...`)
const out = await runInBrowser(cases)
if (out.error) {
  console.error(`ERROR: ${out.error}`)
  process.exit(1)
}

const pad = (s, n) => String(s).padEnd(n)
const num = (v, n = 10) => (v === undefined || v === null ? '-' : v.toFixed(2)).padStart(n)

console.log(`\nAdapter: ${JSON.stringify(out.adapter)}\n`)
console.log(
  `${pad('case', 24)}${pad('cells', 10)}${pad('instr', 7)}${pad('lyr', 5)}${pad('dispatch', 10)}` +
    `${'wasm-O3'.padStart(10)}${'flat-f64'.padStart(10)}${'layered'.padStart(10)}${'perWG'.padStart(10)}` +
    `${'vs wasm'.padStart(9)}${'  maxRel'}`
)
for (const r of out.results) {
  if (r.error) {
    console.log(`${pad(r.label, 24)}ERROR ${r.error}`)
    continue
  }
  const layered = r.layered?.totalMs
  const perWg = r.perWorkgroup?.totalMs
  const bestGpu = Math.min(layered ?? Infinity, perWg ?? Infinity)
  const maxRel = Math.max(r.layered?.maxRel ?? 0, r.perWorkgroup?.maxRel ?? 0)
  const speedup = r.wasmMs / bestGpu
  console.log(
    `${pad(r.label, 24)}${pad(r.meta.numCells.toLocaleString(), 10)}${pad(r.meta.numInstrs, 7)}` +
      `${pad(r.meta.auxLayers, 5)}${pad(r.dispatchCounts?.layered ?? '-', 10)}` +
      `${num(r.wasmMs)}${num(r.jsF64Ms)}${num(layered)}${num(perWg)}` +
      `${(speedup >= 1 ? `${speedup.toFixed(1)}x` : `(${(1 / speedup).toFixed(1)}x)`).padStart(9)}` +
      `  ${maxRel.toExponential(2)}`
  )
}

console.log('\nDetail:')
for (const r of out.results) {
  if (r.error) continue
  const stateMB = ((r.meta.numCells * r.meta.numRuns * 4) / 1024 / 1024).toFixed(1)
  console.log(
    `  ${pad(r.label, 24)} state=${stateMB.padStart(7)} MB  ` +
      `layered encode=${num(r.layered?.encodeMs, 7)} gpu=${num(r.layered?.gpuMs, 8)} ` +
      `+readback=${num(r.layered?.withReadbackMs, 8)}`
  )
}

console.log(
  `\n(layer width profile taken from the real EPS: ${EPS_LAYER_WIDTHS.length} layers, ` +
    `median ${[...EPS_LAYER_WIDTHS].sort((a, b) => a - b)[Math.floor(EPS_LAYER_WIDTHS.length / 2)]} cells)`
)
