// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Emit a JavaScript model from the same IR (and the same per-variable code generator) that
// feeds the WGSL backend.
//
// This exists for two reasons:
//   1. It is the honest CPU baseline for the GPU measurements.  Both backends read and
//      write the same flat buffer using the same generated expressions, so a speedup
//      figure reflects the execution model rather than two unrelated code generators.
//   2. It runs on `Float64Array` or `Float32Array` on demand, which isolates the cost of
//      the GPU's f32-only arithmetic from the cost of the GPU itself.
//

import { sub, allDimensions, allMappings, isTrivialDimension } from '../../../packages/compile/src/_shared/subscript.js'

import { generateInstruction, F32_MAX } from './gen-instr.mjs'

/**
 * Return declarations for the dimension index arrays and dimension mapping arrays that
 * generated code uses to resolve non-trivial subscript references.
 *
 * @param {'wgsl' | 'js'} lang The target language.
 * @return {string[]} The declaration lines.
 */
export function dimensionDecls(lang) {
  const decls = []
  const arr = (name, values) =>
    lang === 'wgsl'
      ? `const ${name} = array<u32, ${values.length}>(${values.map(v => `${v}u`).join(', ')});`
      : `  const ${name} = [${values.join(', ')}];`
  for (const dim of allDimensions()) {
    if (!isTrivialDimension(dim.name)) {
      decls.push(
        arr(
          `DIM_${dim.name}`,
          sub(dim.name).value.map(subId => sub(subId).value)
        )
      )
    }
  }
  for (const m of allMappings()) {
    decls.push(
      arr(
        `MAP_${m.mapFrom}${m.mapTo}`,
        m.value.map(subId => sub(subId).value)
      )
    )
  }
  return decls
}

/**
 * Generate the source text of a JavaScript model factory function.
 *
 * @param {Object} opts The generation options.
 * @param {Object} opts.ir The model IR.
 * @param {Object} opts.control The control parameters.
 * @param {number[]} opts.outputCells The flat cell indices of the output variables.
 * @param {number[]} opts.inputCells The flat cell indices of the input variables.
 * @return {Object} An object with the generated `code` and some statistics.
 */
export function generateJs({ ir, control, outputCells, inputCells }) {
  const instrFns = []
  const instrs = []

  function addInstrs(vars, mode) {
    return vars.map(variable => {
      const { lines, cellCount } = generateInstruction({ ir, variable, mode, lang: 'js' })
      const index = instrs.length
      const body = lines.map(l => `    ${l}`).join('\n')
      instrFns.push(`  function instr_${index}(cell, run) {\n${body}\n  }`)
      const instr = { index, cellCount }
      instrs.push(instr)
      return instr
    })
  }

  const passes = {}
  for (const [passName, layers] of Object.entries(ir.passes)) {
    const mode = passName === 'initConstants' ? 'init-constants' : passName.startsWith('init') ? 'init-levels' : 'eval'
    passes[passName] = layers.map(layerVars => addInstrs(layerVars, mode))
  }

  const callsFor = layers =>
    layers
      .flat()
      .map(instr =>
        instr.cellCount === 1
          ? `    instr_${instr.index}(0, run);`
          : `    for (let c = 0; c < ${instr.cellCount}; c++) instr_${instr.index}(c, run);`
      )
      .join('\n')

  const timeCell = ir.alloc.get('_time').offset
  const numSteps = Math.round((control.finalTime - control.initialTime) / control.timeStep)
  const savePointCount = Math.floor((control.finalTime - control.initialTime) / control.saveper) + 1
  const stepsPerSave = Math.round(control.saveper / control.timeStep)

  const code = `
return function createModel(numRuns, LK_DIR, LK_DATA, ArrayType) {
  const R = numRuns;
  const TIME_STEP = ${control.timeStep};
  const INITIAL_TIME = ${control.initialTime};
  const NUM_STEPS = ${numSteps};
  const STEPS_PER_SAVE = ${stepsPerSave};
  const NUM_SAVE_POINTS = ${savePointCount};
  const F32_MAX = ${F32_MAX};
  const TIME_CELL = ${timeCell};
  const OUT_CELLS = [${outputCells.join(', ')}];
  const IN_CELLS = [${inputCells.join(', ')}];
  const NUM_OUTPUTS = OUT_CELLS.length;
  const NUM_INPUTS = IN_CELLS.length;
  const V = new ArrayType(${ir.numCells} * R);
  const OUT = new ArrayType(NUM_SAVE_POINTS * NUM_OUTPUTS * R);

${dimensionDecls('js').join('\n')}

  function _pow(a, b) { return Math.pow(a, b); }
  function _modulo(x, y) { return x % y; }
  function _quantum(x, y) { return y <= 0 ? x : y * Math.trunc(x / y); }
  function _zidz(a, b) { return Math.abs(b) < 1e-6 ? 0 : a / b; }
  function _xidz(a, b, x) { return Math.abs(b) < 1e-6 ? x : a / b; }
  function _step(t, height, stepTime) { return t + TIME_STEP / 2 > stepTime ? height : 0; }
  function _ramp(t, slope, startTime, endTime) {
    if (t > startTime) {
      if (t < endTime || startTime > endTime) return slope * (t - startTime);
      return slope * (endTime - startTime);
    }
    return 0;
  }
  function _pulse(t, start, width) {
    const timePlus = t + TIME_STEP / 2;
    const w = width === 0 ? TIME_STEP : width;
    return timePlus > start && timePlus < start + w ? 1 : 0;
  }
  function _pulse_train(t, start, width, interval, end) {
    const n = Math.floor((end - start) / interval);
    for (let k = 0; k <= n; k++) {
      if (t <= end && _pulse(t, start + k * interval, width)) return 1;
    }
    return 0;
  }
  function _lookup(dirIndex, input, mode) {
    const off = LK_DIR[dirIndex * 2];
    const n = LK_DIR[dirIndex * 2 + 1];
    if (n === 0) return -F32_MAX;
    for (let i = 0; i < n; i++) {
      const x = LK_DATA[(off + i) * 2];
      if (x >= input) {
        const y = LK_DATA[(off + i) * 2 + 1];
        if (i === 0 || x === input) return y;
        if (mode === 1) return y;
        const lastY = LK_DATA[(off + i - 1) * 2 + 1];
        if (mode === 2) return lastY;
        const lastX = LK_DATA[(off + i - 1) * 2];
        return lastY + ((y - lastY) / (x - lastX)) * (input - lastX);
      }
    }
    return LK_DATA[(off + n - 1) * 2 + 1];
  }

${instrFns.join('\n')}

  function initConstants(run) {
${callsFor(passes.initConstants)}
  }
  function initLevels(run) {
${callsFor(passes.initLevels)}
  }
  function evalAux(run) {
${callsFor(passes.evalAux)}
  }
  function evalLevels(run) {
${callsFor(passes.evalLevels)}
  }

  function runAll(inputs) {
    for (let run = 0; run < R; run++) {
      V[TIME_CELL * R + run] = INITIAL_TIME;
      initConstants(run);
      for (let i = 0; i < NUM_INPUTS; i++) {
        V[IN_CELLS[i] * R + run] = inputs[run * NUM_INPUTS + i];
      }
      initLevels(run);
      let saveIdx = 0;
      for (let step = 0; step <= NUM_STEPS; step++) {
        evalAux(run);
        if (step % STEPS_PER_SAVE === 0 && saveIdx < NUM_SAVE_POINTS) {
          for (let o = 0; o < NUM_OUTPUTS; o++) {
            OUT[(saveIdx * NUM_OUTPUTS + o) * R + run] = V[OUT_CELLS[o] * R + run];
          }
          saveIdx++;
        }
        if (step === NUM_STEPS) break;
        evalLevels(run);
        V[TIME_CELL * R + run] += TIME_STEP;
      }
    }
    return OUT;
  }

  return { V, OUT, runAll, numSavePoints: NUM_SAVE_POINTS, numOutputs: NUM_OUTPUTS };
}
`

  return { code, numInstrs: instrs.length, numSteps, savePointCount, stepsPerSave }
}
