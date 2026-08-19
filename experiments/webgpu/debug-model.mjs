// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Print a per-output comparison between the flat-buffer JS model and SDE's production JS
// model, plus (optionally) the generated JS source, to help track down mismatches.
//

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { runReferenceJsModel } from './validate.mjs'
import { compileModel, instantiateJsModel } from './src/compile.mjs'

const mdlPath = resolve(process.argv[2])
const mdlText = readFileSync(mdlPath, 'utf8')
const modelDir = dirname(mdlPath)

const ref = await runReferenceJsModel(mdlText, [], modelDir)
const outputVarNames = ref.outputNames
const compiled = compileModel({ mdlText, outputVarNames, numRuns: 1, modelDir })
const model = instantiateJsModel(compiled, 1, Float64Array)
model.runAll(new Float64Array(0))

for (let o = 0; o < ref.numOutputs; o++) {
  const expected = []
  const actual = []
  for (let s = 0; s < ref.numSavePoints; s++) {
    expected.push(ref.outputs[o * ref.numSavePoints + s])
    actual.push(model.OUT[s * ref.numOutputs + o])
  }
  const diff = expected.some((e, i) => Math.abs(e - actual[i]) > 1e-9 * Math.max(1, Math.abs(e)))
  if (diff || process.env.ALL) {
    console.log(`${diff ? 'DIFF' : 'ok  '} ${outputVarNames[o]}`)
    if (diff) {
      console.log(`     expected: ${expected.slice(0, 6).join(', ')}`)
      console.log(`     actual:   ${actual.slice(0, 6).join(', ')}`)
    }
  }
}

if (process.env.DUMP_JS) {
  console.log(compiled.js.code)
}
if (process.env.DUMP_WGSL) {
  console.log(compiled.wgsl.code)
}
