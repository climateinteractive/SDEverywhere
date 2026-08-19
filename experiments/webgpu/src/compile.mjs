// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Drive the experimental flat-buffer code generators end to end: parse and analyze a
// Vensim model with SDE, build the flat buffer IR, resolve the control parameters, and
// emit both a JavaScript model and a WGSL compute shader.
//

import { canonicalVensimName } from '../../../packages/compile/src/_shared/helpers.js'

import { analyzeVensimModel } from './analyze.mjs'
import { buildIr, cellIndexFor } from './ir.mjs'
import { generateJs } from './gen-js.mjs'
import { generateWgsl } from './gen-wgsl.mjs'

/**
 * Split a canonical variable reference such as `_a[_a1,_b2]` into its parts.
 *
 * @param {string} ref The canonical variable reference.
 * @return {Object} An object with `varName` and `subIds`.
 */
function splitVarRef(ref) {
  const m = /^([^[]+)(?:\[(.*)\])?$/.exec(ref.trim())
  if (m === null) {
    throw new Error(`Failed to parse variable reference '${ref}'`)
  }
  return {
    varName: m[1],
    subIds: m[2] ? m[2].split(',').map(s => s.trim()) : []
  }
}

/**
 * Compile a Vensim model to a JavaScript model and a WGSL compute shader.
 *
 * @param {Object} opts The compile options.
 * @param {string} opts.mdlText The Vensim model text.
 * @param {string[]} [opts.outputVarNames] The Vensim names of the output variables.
 * @param {string[]} [opts.inputVarNames] The Vensim names of the input variables.
 * @param {number} [opts.numRuns] The ensemble size for the generated shader.
 * @param {string} [opts.modelDir] The directory used to resolve external data files.
 * @return {Object} The compiled artifacts.
 */
export function compileModel({ mdlText, outputVarNames = [], inputVarNames = [], numRuns = 1, modelDir }) {
  const spec = {}
  if (outputVarNames.length > 0) {
    spec.outputVarNames = outputVarNames
  }
  if (inputVarNames.length > 0) {
    spec.inputVarNames = inputVarNames
  }

  const Model = analyzeVensimModel(mdlText, spec, modelDir)
  const ir = buildIr(Model)

  const resolveCells = names =>
    names.map(name => {
      const { varName, subIds } = splitVarRef(canonicalVensimName(name))
      return cellIndexFor(ir, varName, subIds)
    })

  const outputCells = resolveCells(outputVarNames)
  const inputCells = resolveCells(inputVarNames)

  // Pass 1: generate a JS model with placeholder control values so that we can evaluate
  // the constants and read out the real control parameters.
  const placeholder = { initialTime: 0, finalTime: 1, timeStep: 1, saveper: 1 }
  const probeJs = generateJs({ ir, control: placeholder, outputCells: [], inputCells: [] })
  const probeModel = new Function(probeJs.code)()(1, lookupDirArray(ir), ir.lookupDataF64, Float64Array)
  probeModel.runAll(new Float64Array(0))
  const controlCell = name => probeModel.V[cellIndexFor(ir, name)]
  const control = {
    initialTime: controlCell('_initial_time'),
    finalTime: controlCell('_final_time'),
    timeStep: controlCell('_time_step'),
    saveper: controlCell('_saveper')
  }
  for (const [k, v] of Object.entries(control)) {
    if (!Number.isFinite(v)) {
      throw new Error(`Control parameter ${k} did not resolve to a constant value`)
    }
  }

  // Pass 2: generate the real artifacts
  const js = generateJs({ ir, control, outputCells, inputCells })
  const wgsl = generateWgsl({ ir, numRuns, control, outputCells, inputCells })

  return { ir, control, js, wgsl, outputCells, inputCells, lookupDir: lookupDirArray(ir) }
}

/** Build the flat lookup directory array (pairs of data offset and point count). */
function lookupDirArray(ir) {
  const dir = new Int32Array(Math.max(1, ir.lookupDirSize) * 2)
  for (const a of ir.lookupAlloc.values()) {
    for (const [cell, entry] of a.entries) {
      dir[(a.dirOffset + cell) * 2] = entry.dataOffset
      dir[(a.dirOffset + cell) * 2 + 1] = entry.numPoints
    }
  }
  return dir
}

/**
 * Instantiate the generated JavaScript model.
 *
 * @param {Object} compiled The result of `compileModel`.
 * @param {number} numRuns The ensemble size.
 * @param {Function} [ArrayType] The typed array constructor to use for model state.
 * @return {Object} The instantiated model.
 */
export function instantiateJsModel(compiled, numRuns, ArrayType = Float64Array) {
  const data = ArrayType === Float32Array ? compiled.ir.lookupData : compiled.ir.lookupDataF64
  return new Function(compiled.js.code)()(numRuns, compiled.lookupDir, data, ArrayType)
}
