// Inspect the real EPS model's structure using SDE's parse + readVariables phases.
//
// Note: SDE cannot fully analyze this version of the EPS (it uses `VECTOR RANK`, which the
// compiler does not implement), so this stops after reading variables and derives an
// approximate dependency depth directly from the parsed equation ASTs.
import { readFileSync } from 'node:fs'

import { parseModel, resetState } from '../../packages/compile/src/index.js'
import Model from '../../packages/compile/src/model/model.js'
import { sub, subscriptFamilies } from '../../packages/compile/src/_shared/subscript.js'

const mdlPath = process.argv[2]
const modelDir = process.argv[3]

resetState()
const parsed = parseModel(readFileSync(mdlPath, 'utf8'), 'vensim', modelDir)
Model.read(parsed, {}, new Map(), new Map(), modelDir, { stopAfterReadVariables: true })

const vars = Model.variables
console.log(`equations parsed:    ${parsed.root.equations.length}`)
console.log(`variable instances:  ${vars.length}`)

const cellsOf = v => subscriptFamilies(v.subscripts).reduce((a, f) => a * sub(f).size, 1)

// Variables whose RHS is a stock-like function are treated as dependency roots: their value
// at time t comes from the previous step, so they do not deepen the within-step chain.
const STOCKY = new Set([
  '_INTEG',
  '_ACTIVE_INITIAL',
  '_DELAY',
  '_DELAY_FIXED',
  '_DELAY1',
  '_DELAY1I',
  '_DELAY3',
  '_DELAY3I',
  '_SMOOTH',
  '_SMOOTHI',
  '_SMOOTH3',
  '_SMOOTH3I',
  '_TREND',
  '_SAMPLE_IF_TRUE',
  '_DEPRECIATE_STRAIGHTLINE',
  '_INITIAL'
])

function rhsRefs(e, acc = new Set(), inStock = false) {
  if (e === null || typeof e !== 'object') return acc
  switch (e.kind) {
    case 'variable-ref':
      if (!inStock) acc.add(e.varId)
      break
    case 'parens':
    case 'unary-op':
      rhsRefs(e.expr, acc, inStock)
      break
    case 'binary-op':
      rhsRefs(e.lhs, acc, inStock)
      rhsRefs(e.rhs, acc, inStock)
      break
    case 'lookup-call':
      rhsRefs(e.arg, acc, inStock)
      break
    case 'function-call':
      if (STOCKY.has(e.fnId)) break
      for (const a of e.args) rhsRefs(a, acc, inStock)
      break
    default:
      break
  }
  return acc
}

// Collapse instances to one node per variable name
const byName = new Map()
for (const v of vars) {
  if (v.parsedEqn === undefined) continue
  const name = v.varName
  let n = byName.get(name)
  if (n === undefined) {
    n = { name, cells: 0, deps: new Set(), stocky: false, type: v.varType }
    byName.set(name, n)
  }
  n.cells = Math.max(n.cells, cellsOf(v))
  const rhs = v.parsedEqn.rhs
  if (rhs.kind === 'expr') {
    const top = rhs.expr
    if (top.kind === 'function-call' && STOCKY.has(top.fnId)) n.stocky = true
    for (const d of rhsRefs(top)) n.deps.add(d)
  }
}
for (const n of byName.values()) n.deps.delete(n.name)

// A variable with no variable references on its RHS is a constant, a lookup, or external
// data.  Those are evaluated once at init, not every time step, so exclude them from the
// per-time-step work profile.
for (const n of byName.values()) {
  n.perStep = n.deps.size > 0 || n.stocky
}

// Longest-path depth, relaxed to a fixed point (stock-like variables are pinned at 0)
const depth = new Map([...byName.keys()].map(k => [k, 0]))
for (let iter = 0; iter < 200; iter++) {
  let changed = false
  for (const n of byName.values()) {
    if (n.stocky) continue
    let d = 0
    for (const dep of n.deps) {
      const dd = depth.get(dep)
      if (dd !== undefined) d = Math.max(d, dd + 1)
    }
    if (d > depth.get(n.name)) {
      depth.set(n.name, d)
      changed = true
    }
  }
  if (!changed) {
    console.log(`dependency depth converged after ${iter + 1} passes`)
    break
  }
}

const layers = new Map()
let totalCells = 0
for (const n of byName.values()) {
  if (!n.perStep) continue
  const d = depth.get(n.name)
  layers.set(d, (layers.get(d) || 0) + n.cells)
  totalCells += n.cells
}
console.log(
  `variables evaluated every time step: ${[...byName.values()].filter(n => n.perStep).length} of ${byName.size}`
)
const widths = [...layers.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w)
const sorted = [...widths].sort((a, b) => a - b)
const pct = p => sorted[Math.floor((sorted.length - 1) * p)]

console.log(
  `\nper time step: ${totalCells.toLocaleString()} cell evaluations across ${widths.length} dependency layers`
)
console.log(
  `  layer width  min=${sorted[0]}  p25=${pct(0.25)}  p50=${pct(0.5)}  p90=${pct(0.9)}  max=${sorted[sorted.length - 1]}`
)
console.log(`  mean width   ${Math.round(totalCells / widths.length)}`)
console.log(`  layers narrower than 256 cells: ${sorted.filter(w => w < 256).length} of ${widths.length}`)
console.log(`  layers narrower than 1024 cells: ${sorted.filter(w => w < 1024).length} of ${widths.length}`)

// The number that decides whether a GPU can help: how much of the per-step work sits in
// layers too narrow to fill the machine?
for (const threshold of [64, 256, 1024, 4096]) {
  const work = sorted.filter(w => w < threshold).reduce((a, b) => a + b, 0)
  console.log(
    `  work in layers narrower than ${String(threshold).padStart(5)} cells: ` +
      `${((work / totalCells) * 100).toFixed(1)}%`
  )
}

if (process.env.DUMP_LAYERS) {
  const ordered = [...layers.entries()].sort((a, b) => a[0] - b[0])
  console.log('\nLAYER_WIDTHS=' + JSON.stringify(ordered.map(([, w]) => w)))
}

const byShape = new Map()
for (const v of vars) {
  if (v.parsedEqn === undefined) continue
  if (!byName.get(v.varName)?.perStep) continue
  const fams = subscriptFamilies(v.subscripts)
  const key = fams.length === 0 ? '(scalar)' : fams.map(f => `${f}[${sub(f).size}]`).join(' x ')
  const e = byShape.get(key) || { count: 0, cells: 0 }
  e.count++
  e.cells += cellsOf(v)
  byShape.set(key, e)
}
console.log('\nTop per-time-step variable shapes by total cells:')
for (const [key, e] of [...byShape.entries()].sort((a, b) => b[1].cells - a[1].cells).slice(0, 12)) {
  console.log(`  ${String(e.cells).padStart(9)} cells  ${String(e.count).padStart(5)} vars  ${key}`)
}

const scalarish = [...byShape.entries()].filter(([, e]) => e.cells / e.count < 32)
console.log(
  `\nvariables with fewer than 32 cells each: ` + `${scalarish.reduce((a, [, e]) => a + e.count, 0)} of ${vars.length}`
)

for (const name of ['_initial_time', '_final_time', '_time_step', '_saveper']) {
  const v = Model.varWithName(name)
  console.log(`${name} = ${v?.modelFormula}`)
}
