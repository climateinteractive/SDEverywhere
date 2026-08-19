// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Check the experimental flat-buffer JS model against the model that SDE's production JS
// code generator produces for the same `.mdl` file.  If these agree, the flat-buffer IR
// (subscript layout, evaluation layers, expression translation) is trustworthy, and any
// remaining difference in the WebGPU results can be attributed to f32 arithmetic.
//

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { generateCode, parseModel, resetState } from '../../packages/compile/src/index.js'
import { getJsModelFunctions } from '../../packages/runtime/dist/index.js'

import { compileModel, instantiateJsModel } from './src/compile.mjs'

/**
 * Run a model that was produced by SDE's production JS code generator.
 *
 * @param {string} mdlText The Vensim model text.
 * @param {string[]} outputVarNames The Vensim names of the output variables.
 * @param {string} [modelDir] The directory used to resolve external data files.
 * @return {Promise<Object>} The outputs plus the control parameters.
 */
export async function runReferenceJsModel(mdlText, outputVarNames, modelDir) {
  resetState()
  const parsed = parseModel(mdlText, 'vensim', modelDir)
  const spec = { outputVarNames }
  const code = generateCode(parsed, {
    spec,
    operations: ['generateJS'],
    extData: new Map(),
    directData: new Map(),
    modelDirname: modelDir
  })

  const dir = mkdtempSync(join(tmpdir(), 'sde-wgpu-'))
  const file = join(dir, 'model.js')
  writeFileSync(file, code.replace(/\/\*export\*\//g, 'export'))
  const mod = await import(`file://${file}`)
  const model = await mod.default()

  const fns = getJsModelFunctions()
  model.setModelFunctions(fns)

  const initialTime = model.getInitialTime()
  const finalTime = model.getFinalTime()
  const timeStep = model.getTimeStep()
  const saveFreq = model.getSaveFreq()
  const numSavePoints = Math.round((finalTime - initialTime) / saveFreq) + 1

  let time = initialTime
  model.setTime(time)
  fns.setContext({ timeStep, currentTime: time })
  model.initConstants()
  model.initLevels()

  const outputNames = model.outputVarNames
  const numOutputs = model.outputVarIds.length
  const outputs = new Float64Array(numOutputs * numSavePoints)
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  let savePointIndex = 0
  while (step <= lastStep) {
    model.evalAux()
    if (time % saveFreq < 1e-6) {
      let outputVarIndex = 0
      model.storeOutputs(value => {
        outputs[outputVarIndex * numSavePoints + savePointIndex] = value
        outputVarIndex++
      })
      savePointIndex++
    }
    if (step === lastStep) break
    model.evalLevels()
    time += timeStep
    model.setTime(time)
    fns.setContext({ timeStep, currentTime: time })
    step++
  }

  return {
    outputs,
    outputNames,
    numSavePoints,
    numOutputs,
    control: { initialTime, finalTime, timeStep, saveper: saveFreq }
  }
}

/**
 * Compare the flat-buffer model outputs against the reference model outputs.
 *
 * @param {string} mdlPath The path to the `.mdl` file.
 * @param {string[]} outputVarNames The Vensim names of the output variables.
 * @return {Promise<Object>} A report with the maximum absolute and relative differences.
 */
export async function validateModel(mdlPath, outputVarNames) {
  const mdlText = readFileSync(mdlPath, 'utf8')
  const modelDir = dirname(mdlPath)

  const ref = await runReferenceJsModel(mdlText, outputVarNames, modelDir)
  // When no outputs were requested, SDE outputs every variable; use that same list
  if (outputVarNames.length === 0) {
    outputVarNames = ref.outputNames
  }

  const compiled = compileModel({ mdlText, outputVarNames, numRuns: 1, modelDir })
  const results = {}
  for (const [label, ArrayType] of [
    ['f64', Float64Array],
    ['f32', Float32Array]
  ]) {
    const model = instantiateJsModel(compiled, 1, ArrayType)
    model.runAll(new Float64Array(0))
    let maxAbs = 0
    let maxRel = 0
    let worst = null
    for (let o = 0; o < ref.numOutputs; o++) {
      for (let s = 0; s < ref.numSavePoints; s++) {
        const expected = ref.outputs[o * ref.numSavePoints + s]
        const actual = model.OUT[(s * ref.numOutputs + o) * 1 + 0]
        const abs = Math.abs(actual - expected)
        const rel = Math.abs(expected) > 1e-12 ? abs / Math.abs(expected) : abs
        if (rel > maxRel) {
          maxRel = rel
          worst = { output: outputVarNames[o], savePoint: s, expected, actual }
        }
        maxAbs = Math.max(maxAbs, abs)
      }
    }
    results[label] = { maxAbs, maxRel, worst }
  }

  return { control: ref.control, numSavePoints: ref.numSavePoints, numOutputs: ref.numOutputs, results, compiled }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const mdlPath = resolve(process.argv[2])
  const outputVarNames = process.argv.slice(3)
  const report = await validateModel(mdlPath, outputVarNames)
  console.log(`control: ${JSON.stringify(report.control)}`)
  console.log(`save points: ${report.numSavePoints}, outputs: ${report.numOutputs}`)
  for (const [label, r] of Object.entries(report.results)) {
    console.log(`${label}: maxAbs=${r.maxAbs.toExponential(3)} maxRel=${r.maxRel.toExponential(3)}`)
    if (r.maxRel > 1e-9) {
      console.log(`   worst: ${JSON.stringify(r.worst)}`)
    }
  }
}
