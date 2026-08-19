// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Run the flat-buffer JS model against SDE's production JS model for every model in the
// top-level `models` directory.  This measures how much of the Vensim language the
// prototype's WGSL-oriented code generator currently covers, and flags any model where the
// flat-buffer layout disagrees with the production output.
//

import { readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { validateModel } from './validate.mjs'

const modelsDir = resolve(process.argv[2] || '../../models')
const only = process.argv[3]

const dirs = readdirSync(modelsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'node_modules')
  .map(d => d.name)
  .filter(n => (only ? n === only : true))
  .sort()

const results = []
for (const name of dirs) {
  const mdlPath = join(modelsDir, name, `${name}.mdl`)
  if (!existsSync(mdlPath)) {
    continue
  }
  try {
    const report = await validateModel(mdlPath, [])
    results.push({
      name,
      status: report.results.f64.maxRel < 1e-9 ? 'match' : 'MISMATCH',
      f64: report.results.f64.maxRel,
      f32: report.results.f32.maxRel,
      vars: report.compiled.ir.numCells,
      instrs: report.compiled.js.numInstrs
    })
  } catch (e) {
    results.push({ name, status: 'unsupported', reason: e.message.split('\n')[0].slice(0, 90) })
  }
}

const matched = results.filter(r => r.status === 'match')
const mismatched = results.filter(r => r.status === 'MISMATCH')
const unsupported = results.filter(r => r.status === 'unsupported')

console.log(`\n=== MATCH (${matched.length}/${results.length}) ===`)
for (const r of matched) {
  console.log(
    `  ${r.name.padEnd(24)} cells=${String(r.vars).padStart(5)} instrs=${String(r.instrs).padStart(5)} ` +
      `f32 maxRel=${r.f32.toExponential(2)}`
  )
}
if (mismatched.length > 0) {
  console.log(`\n=== MISMATCH (${mismatched.length}) ===`)
  for (const r of mismatched) {
    console.log(`  ${r.name.padEnd(24)} f64 maxRel=${r.f64.toExponential(3)}`)
  }
}
console.log(`\n=== UNSUPPORTED (${unsupported.length}) ===`)
for (const r of unsupported) {
  console.log(`  ${r.name.padEnd(24)} ${r.reason}`)
}
