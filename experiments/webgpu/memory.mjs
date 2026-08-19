// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Memory and readback experiment for the ensemble ("automatic calibration") use case.
//
// The question this answers: if you run an En-ROADS-scale model 100 or 1000 times
// concurrently on the GPU and capture every output variable at every save point, how much
// memory does that need and how much does it cost to get the results back to JavaScript?
//
// The model shape here is chosen to match En-ROADS: ~350 output variables, an annual save
// frequency over ~110 years, and a sub-annual time step.
//

import { buildCase, runInBrowser } from './bench/harness.mjs'
import { enroadsShapedModel } from './bench/synth-models.mjs'

const NUM_VARS = 350
const START_YEAR = 1990
const END_YEAR = 2100
const TIME_STEP = 0.25

const mdlText = enroadsShapedModel({
  numVars: NUM_VARS,
  depth: 25,
  startTime: START_YEAR,
  finalTime: END_YEAR,
  timeStep: TIME_STEP
})

const allOutputs = Array.from({ length: NUM_VARS }, (_, i) => `v${Math.floor(i / 14)}x${i % 14}`)

const cases = []

// Sweep the ensemble size while capturing every output variable
for (const numRuns of [1, 10, 100, 1000]) {
  cases.push(
    buildCase({
      label: `all-outputs runs=${numRuns}`,
      mdlText,
      outputVarNames: allOutputs,
      inputVarNames: ['policy'],
      inputValues: [0.5, 1, 1.5, 2],
      numRuns,
      reps: 3,
      strategies: ['perThread'],
      // The production JS/wasm baselines are built once and reused across cases via the
      // build cache, so this stays cheap
      meta: { family: 'all-outputs', numRuns }
    })
  )
}

// The same model and ensemble sizes, but capturing only the handful of variables an
// objective function would actually look at.  This also pushes to larger ensembles: a
// GPU needs tens of thousands of threads in flight to reach full occupancy, and with one
// thread per run the ensemble size *is* the thread count.
for (const numRuns of [100, 1000, 4000, 16000]) {
  cases.push(
    buildCase({
      label: `few-outputs runs=${numRuns}`,
      mdlText,
      outputVarNames: allOutputs.slice(0, 10),
      inputVarNames: ['policy'],
      inputValues: [0.5, 1, 1.5, 2],
      numRuns,
      reps: 3,
      strategies: ['perThread'],
      meta: { family: 'few-outputs', numRuns }
    })
  )
}

// One more all-outputs point, to see whether the GPU keeps scaling once past the
// occupancy limit even with a large output buffer
cases.push(
  buildCase({
    label: `all-outputs runs=4000`,
    mdlText,
    outputVarNames: allOutputs,
    inputVarNames: ['policy'],
    inputValues: [0.5, 1, 1.5, 2],
    numRuns: 4000,
    reps: 3,
    strategies: ['perThread'],
    meta: { family: 'all-outputs', numRuns: 4000 }
  })
)

console.log(`Model: ${NUM_VARS} output variables, ${START_YEAR}-${END_YEAR}, TIME STEP ${TIME_STEP}`)
console.log(`Running ${cases.length} cases...`)

const out = await runInBrowser(cases)
if (out.error) {
  console.error(`ERROR: ${out.error}`)
  process.exit(1)
}

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(1)}`
const num = (v, n = 9) => (v === undefined ? '-' : v.toFixed(2)).padStart(n)
const pad = (s, n) => String(s).padEnd(n)

console.log(`\nAdapter: ${JSON.stringify(out.adapter)}\n`)
console.log(
  `${pad('case', 24)}${pad('outs', 6)}${pad('saves', 7)}` +
    `${'stateMB'.padStart(9)}${'outMB(f32)'.padStart(11)}${'outMB(f64)'.padStart(11)}` +
    `${'wasm-O3'.padStart(10)}${'gpu'.padStart(9)}${'gpu+read'.padStart(10)}${'read'.padStart(8)}${'vs wasm'.padStart(9)}`
)
for (const r of out.results) {
  if (r.error) {
    console.log(`${pad(r.label, 24)}ERROR ${r.error}`)
    continue
  }
  const saves = r.meta.savePointCount
  const outs = r.meta.numOutputs
  const runs = r.meta.numRuns
  const stateBytes = r.meta.numCells * runs * 4
  const outBytes32 = outs * saves * runs * 4
  const gpu = r.perThread?.totalMs
  const gpuRead = r.perThread?.withReadbackMs
  console.log(
    `${pad(r.label, 24)}${pad(outs, 6)}${pad(saves, 7)}` +
      `${mb(stateBytes).padStart(9)}${mb(outBytes32).padStart(11)}${mb(outBytes32 * 2).padStart(11)}` +
      `${num(r.wasmMs, 10)}${num(gpu)}${num(gpuRead, 10)}${num(gpuRead - gpu, 8)}` +
      `${(r.wasmMs / gpuRead).toFixed(1).padStart(8)}x`
  )
}
