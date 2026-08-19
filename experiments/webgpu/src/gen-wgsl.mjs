// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Emit a complete WGSL compute shader for a model IR.
//
// Three execution strategies are generated from the same set of per-variable functions:
//
// `layered` (good for a single run of a model with very wide subscript dimensions)
//   One dispatch per topological layer per time step.  Every independent (variable, cell,
//   run) triple in a layer becomes one GPU thread.  Dispatches within a compute pass are
//   ordered and memory-synchronized by the WebGPU spec, so a whole simulation can be
//   encoded into a single command buffer and submitted once.
//
// `perWorkgroup` (the middle ground)
//   One workgroup per run, with the whole time loop inside the shader and a
//   `workgroupBarrier()` between layers instead of a dispatch.  A single run can use up to
//   256 lanes, and there is no per-layer command overhead.
//
// `perThread` (good for ensembles: Monte Carlo, optimization, sensitivity sweeps)
//   One GPU thread runs one entire model run, start to finish, with the time loop inside
//   the shader.  There are no barriers and no dispatch overhead at all, and because every
//   thread executes exactly the same instruction stream there is no warp divergence.  The
//   run index is the minor index of the value buffer, so neighbouring threads read
//   neighbouring memory.
//

import { generateInstruction, F32_MAX } from './gen-instr.mjs'
import { dimensionDecls } from './gen-js.mjs'

/** The number of threads per workgroup used by the `layered` and `perThread` strategies. */
export const WORKGROUP_SIZE = 64

/** The number of threads per workgroup used by the `perWorkgroup` strategy. */
export const WG_SIZE = 256

/**
 * Generate the WGSL shader source and the associated dispatch plan for a model.
 *
 * @param {Object} opts The generation options.
 * @param {Object} opts.ir The model IR.
 * @param {number} opts.numRuns The number of concurrent model runs (ensemble size).
 * @param {Object} opts.control The control parameters (`initialTime`, `finalTime`, `timeStep`, `saveper`).
 * @param {number[]} opts.outputCells The flat cell indices of the output variables.
 * @param {number[]} opts.inputCells The flat cell indices of the input variables.
 * @return {Object} An object with the shader `code`, the workgroup `table`, and the
 * per-strategy dispatch plans.
 */
export function generateWgsl({ ir, numRuns, control, outputCells, inputCells }) {
  const R = numRuns
  const numSteps = Math.round((control.finalTime - control.initialTime) / control.timeStep)
  const savePointCount = Math.floor((control.finalTime - control.initialTime) / control.saveper) + 1
  const stepsPerSave = Math.round(control.saveper / control.timeStep)

  //
  // Generate one function per variable instance.  Instructions are numbered globally so
  // that both strategies can share them.
  //
  const instrFns = []
  const instrs = []

  function addInstrs(vars, mode) {
    return vars.map(variable => {
      const { lines, cellCount } = generateInstruction({ ir, variable, mode, lang: 'wgsl' })
      const index = instrs.length
      const body = lines.map(l => `  ${l}`).join('\n')
      instrFns.push(
        `// ${variable.modelLHS} = ${(variable.origModelFormula || variable.modelFormula || '').replace(/\n/g, ' ')}\n` +
          `fn instr_${index}(cell: u32, run: u32) {\n${body}\n}`
      )
      const instr = { index, cellCount, refId: variable.refId }
      instrs.push(instr)
      return instr
    })
  }

  const passes = {}
  for (const [passName, layers] of Object.entries(ir.passes)) {
    const mode = passName === 'evalAux' || passName === 'evalLevels' ? 'eval' : 'init-levels'
    passes[passName] = layers.map(layerVars =>
      addInstrs(layerVars, passName === 'initConstants' ? 'init-constants' : mode)
    )
  }

  //
  // Build the workgroup dispatch table used by the `layered` strategy.  Each entry says
  // which instruction a workgroup should run and which flat (cell, run) range it covers.
  //
  const table = []
  const layerPlan = []

  function planLayer(layerInstrs) {
    const base = table.length / 4
    for (const instr of layerInstrs) {
      const total = instr.cellCount * R
      const numWg = Math.ceil(total / WORKGROUP_SIZE)
      for (let w = 0; w < numWg; w++) {
        table.push(instr.index, w * WORKGROUP_SIZE, total, 0)
      }
    }
    const count = table.length / 4 - base
    return { base, count }
  }

  const plan = {}
  for (const [passName, layers] of Object.entries(passes)) {
    plan[passName] = layers.map(layerInstrs => {
      const p = planLayer(layerInstrs)
      layerPlan.push(p)
      return p
    })
  }

  //
  // Dimension index arrays (only needed for non-trivial dimensions) and dimension mappings
  //
  const dimDecls = dimensionDecls('wgsl')

  //
  // Lookup directory: cell index -> (data offset, number of points)
  //
  const lookupDir = new Int32Array(Math.max(1, ir.lookupDirSize) * 2)
  for (const a of ir.lookupAlloc.values()) {
    for (const [cell, entry] of a.entries) {
      lookupDir[(a.dirOffset + cell) * 2] = entry.dataOffset
      lookupDir[(a.dirOffset + cell) * 2 + 1] = entry.numPoints
    }
  }

  const timeCell = ir.alloc.get('_time').offset

  const prelude = `
//
// Generated by the SDEverywhere WebGPU prototype.  Do not edit.
//

const R: u32 = ${R}u;
const NUM_CELLS: u32 = ${ir.numCells}u;
const TIME_CELL: u32 = ${timeCell}u;
const TIME_STEP: f32 = ${fl(control.timeStep)};
const INITIAL_TIME: f32 = ${fl(control.initialTime)};
const NUM_STEPS: u32 = ${numSteps}u;
const STEPS_PER_SAVE: u32 = ${stepsPerSave}u;
const NUM_OUTPUTS: u32 = ${outputCells.length}u;
const NUM_SAVE_POINTS: u32 = ${savePointCount}u;
const NUM_INPUTS: u32 = ${inputCells.length}u;
const F32_MAX: f32 = ${fl(F32_MAX)};

@group(0) @binding(0) var<storage, read_write> V: array<f32>;
@group(0) @binding(1) var<storage, read> LK_DIR: array<vec2<i32>>;
@group(0) @binding(2) var<storage, read> LK_DATA: array<f32>;
@group(0) @binding(3) var<storage, read> WGT: array<vec4<u32>>;
@group(0) @binding(4) var<storage, read_write> OUT: array<f32>;
@group(0) @binding(5) var<storage, read> INP: array<f32>;

${dimDecls.join('\n')}
const OUT_CELLS = array<u32, ${Math.max(1, outputCells.length)}>(${(outputCells.length > 0 ? outputCells : [0]).map(c => `${c}u`).join(', ')});
const IN_CELLS = array<u32, ${Math.max(1, inputCells.length)}>(${(inputCells.length > 0 ? inputCells : [0]).map(c => `${c}u`).join(', ')});

//
// Model function implementations (mirroring the semantics of the SDE JS runtime)
//

const EPSILON: f32 = 1e-6;

fn _pow(a: f32, b: f32) -> f32 {
  if (a < 0.0) {
    let r = round(b);
    if (abs(b - r) < 1e-6) {
      let m = pow(-a, b);
      return select(m, -m, (i32(r) & 1) == 1);
    }
  }
  return pow(a, b);
}

fn _modulo(x: f32, y: f32) -> f32 {
  return x - y * trunc(x / y);
}

fn _quantum(x: f32, y: f32) -> f32 {
  return select(y * trunc(x / y), x, y <= 0.0);
}

fn _zidz(a: f32, b: f32) -> f32 {
  return select(a / b, 0.0, abs(b) < EPSILON);
}

fn _xidz(a: f32, b: f32, x: f32) -> f32 {
  return select(a / b, x, abs(b) < EPSILON);
}

fn _step(t: f32, height: f32, stepTime: f32) -> f32 {
  return select(0.0, height, t + TIME_STEP / 2.0 > stepTime);
}

fn _ramp(t: f32, slope: f32, startTime: f32, endTime: f32) -> f32 {
  if (t > startTime) {
    if (t < endTime || startTime > endTime) {
      return slope * (t - startTime);
    }
    return slope * (endTime - startTime);
  }
  return 0.0;
}

fn _pulse(t: f32, start: f32, width: f32) -> f32 {
  let timePlus = t + TIME_STEP / 2.0;
  let w = select(width, TIME_STEP, width == 0.0);
  return select(0.0, 1.0, timePlus > start && timePlus < start + w);
}

fn _pulse_train(t: f32, start: f32, width: f32, interval: f32, end: f32) -> f32 {
  let n = i32(floor((end - start) / interval));
  for (var k: i32 = 0; k <= n; k = k + 1) {
    if (t <= end && _pulse(t, start + f32(k) * interval, width) > 0.0) {
      return 1.0;
    }
  }
  return 0.0;
}

// Linear interpolation over the (x,y) pairs of one lookup instance.  This is the
// stateless equivalent of \`JsModelLookup.getValue\` with 'interpolate' mode.
fn _lookup(dirIndex: u32, input: f32, mode: u32) -> f32 {
  let entry = LK_DIR[dirIndex];
  let off = u32(entry.x);
  let n = u32(entry.y);
  if (n == 0u) {
    return -F32_MAX;
  }
  for (var i: u32 = 0u; i < n; i = i + 1u) {
    let x = LK_DATA[(off + i) * 2u];
    if (x >= input) {
      let y = LK_DATA[(off + i) * 2u + 1u];
      if (i == 0u || x == input) {
        return y;
      }
      if (mode == 1u) {
        return y;
      }
      let lastY = LK_DATA[(off + i - 1u) * 2u + 1u];
      if (mode == 2u) {
        return lastY;
      }
      let lastX = LK_DATA[(off + i - 1u) * 2u];
      return lastY + ((y - lastY) / (x - lastX)) * (input - lastX);
    }
  }
  return LK_DATA[(off + n - 1u) * 2u + 1u];
}
`

  //
  // The instruction dispatcher (shared by both strategies)
  //
  const switchCases = instrs.map(i => `    case ${i.index}u: { instr_${i.index}(cell, run); }`).join('\n')
  const dispatcher = `
fn exec(instr: u32, cell: u32, run: u32) {
  switch (instr) {
${switchCases}
    default: {}
  }
}
`

  //
  // Strategy A: one entry point per layer, plus small entry points for time keeping,
  // input application, and output storage.
  //
  const layerEntryPoints = []
  let layerIndex = 0
  for (const [passName, layers] of Object.entries(plan)) {
    layers.forEach((p, n) => {
      layerEntryPoints.push(`
@compute @workgroup_size(${WORKGROUP_SIZE})
fn ${passName}_${n}(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let e = WGT[${p.base}u + wid.x];
  let flat = e.y + lid.x;
  if (flat >= e.z) { return; }
  exec(e.x, flat / R, flat % R);
}`)
      layerIndex++
    })
  }

  const layeredSupport = `
@compute @workgroup_size(${WORKGROUP_SIZE})
fn setTime(@builtin(global_invocation_id) gid: vec3<u32>) {
  let run = gid.x;
  if (run >= R) { return; }
  V[TIME_CELL * R + run] = INITIAL_TIME;
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn advanceTime(@builtin(global_invocation_id) gid: vec3<u32>) {
  let run = gid.x;
  if (run >= R) { return; }
  V[TIME_CELL * R + run] = V[TIME_CELL * R + run] + TIME_STEP;
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn applyInputs(@builtin(global_invocation_id) gid: vec3<u32>) {
  let run = gid.x;
  if (run >= R) { return; }
  for (var i: u32 = 0u; i < NUM_INPUTS; i = i + 1u) {
    V[IN_CELLS[i] * R + run] = INP[run * NUM_INPUTS + i];
  }
}

// One thread per (save point slot, output, run); the save index is derived from the
// current time so that the whole run can be encoded up front.
@compute @workgroup_size(${WORKGROUP_SIZE})
fn storeOutputs(@builtin(global_invocation_id) gid: vec3<u32>) {
  let flat = gid.x;
  if (flat >= NUM_OUTPUTS * R) { return; }
  let o = flat / R;
  let run = flat % R;
  let t = V[TIME_CELL * R + run];
  let saveIdx = u32(round((t - INITIAL_TIME) / (TIME_STEP * f32(STEPS_PER_SAVE))));
  if (saveIdx >= NUM_SAVE_POINTS) { return; }
  OUT[(saveIdx * NUM_OUTPUTS + o) * R + run] = V[OUT_CELLS[o] * R + run];
}
`

  //
  // Strategy C: one thread per run, entire simulation inside the shader.
  //
  const callsFor = layers =>
    layers
      .flat()
      .map(instr =>
        instr.cellCount === 1
          ? `  instr_${instr.index}(0u, run);`
          : `  for (var c: u32 = 0u; c < ${instr.cellCount}u; c = c + 1u) { instr_${instr.index}(c, run); }`
      )
      .join('\n')

  const perThread = `
fn pt_initConstants(run: u32) {
${callsFor(passes.initConstants)}
}

fn pt_initLevels(run: u32) {
${callsFor(passes.initLevels)}
}

fn pt_evalAux(run: u32) {
${callsFor(passes.evalAux)}
}

fn pt_evalLevels(run: u32) {
${callsFor(passes.evalLevels)}
}

fn pt_store(run: u32, saveIdx: u32) {
  for (var o: u32 = 0u; o < NUM_OUTPUTS; o = o + 1u) {
    OUT[(saveIdx * NUM_OUTPUTS + o) * R + run] = V[OUT_CELLS[o] * R + run];
  }
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn runAll(@builtin(global_invocation_id) gid: vec3<u32>) {
  let run = gid.x;
  if (run >= R) { return; }

  V[TIME_CELL * R + run] = INITIAL_TIME;
  pt_initConstants(run);
  for (var i: u32 = 0u; i < NUM_INPUTS; i = i + 1u) {
    V[IN_CELLS[i] * R + run] = INP[run * NUM_INPUTS + i];
  }
  pt_initLevels(run);

  var saveIdx: u32 = 0u;
  for (var step: u32 = 0u; step <= NUM_STEPS; step = step + 1u) {
    pt_evalAux(run);
    if (step % STEPS_PER_SAVE == 0u && saveIdx < NUM_SAVE_POINTS) {
      pt_store(run, saveIdx);
      saveIdx = saveIdx + 1u;
    }
    if (step == NUM_STEPS) { break; }
    pt_evalLevels(run);
    V[TIME_CELL * R + run] = V[TIME_CELL * R + run] + TIME_STEP;
  }
}
`

  //
  // Strategy B: one workgroup per run, whole simulation inside the shader.
  //
  // This is the middle ground between the other two.  Like `perThread` it encodes a single
  // dispatch, so there is no per-layer command overhead; like `layered` it spreads the
  // cells of a layer across many threads, so a single run of a wide model still uses more
  // than one lane.  Layers are separated by `workgroupBarrier()` instead of by dispatches,
  // which is roughly three orders of magnitude cheaper.
  //
  const wgLayerFn = (name, layerInstrs) => {
    const body = layerInstrs
      .map((instr, n) => {
        if (instr.cellCount === 1) {
          // Spread scalar instructions across threads: threads in different SIMD groups
          // make progress concurrently even though the branches are divergent
          return `  if (tid == ${n % WG_SIZE}u) { instr_${instr.index}(0u, run); }`
        }
        return `  for (var c: u32 = tid; c < ${instr.cellCount}u; c = c + ${WG_SIZE}u) { instr_${instr.index}(c, run); }`
      })
      .join('\n')
    return `fn ${name}(run: u32, tid: u32) {\n${body}\n}`
  }

  const wgFns = []
  const wgCalls = {}
  for (const [passName, layers] of Object.entries(passes)) {
    wgCalls[passName] = layers.map((layerInstrs, n) => {
      const fnName = `wg_${passName}_${n}`
      wgFns.push(wgLayerFn(fnName, layerInstrs))
      return `  ${fnName}(run, tid);\n  workgroupBarrier();`
    })
  }

  const perWorkgroup = `
${wgFns.join('\n\n')}

@compute @workgroup_size(${WG_SIZE})
fn runWorkgroup(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  let run = wid.x;
  let tid = lid.x;

  if (tid == 0u) {
    V[TIME_CELL * R + run] = INITIAL_TIME;
  }
  workgroupBarrier();
${wgCalls.initConstants.join('\n')}
  for (var i: u32 = tid; i < NUM_INPUTS; i = i + ${WG_SIZE}u) {
    V[IN_CELLS[i] * R + run] = INP[run * NUM_INPUTS + i];
  }
  workgroupBarrier();
${wgCalls.initLevels.join('\n')}

  var saveIdx: u32 = 0u;
  for (var step: u32 = 0u; step <= NUM_STEPS; step = step + 1u) {
${wgCalls.evalAux.join('\n')}
    if (step % STEPS_PER_SAVE == 0u && saveIdx < NUM_SAVE_POINTS) {
      for (var o: u32 = tid; o < NUM_OUTPUTS; o = o + ${WG_SIZE}u) {
        OUT[(saveIdx * NUM_OUTPUTS + o) * R + run] = V[OUT_CELLS[o] * R + run];
      }
      saveIdx = saveIdx + 1u;
    }
    if (step == NUM_STEPS) { break; }
    workgroupBarrier();
${wgCalls.evalLevels.join('\n')}
    if (tid == 0u) {
      V[TIME_CELL * R + run] = V[TIME_CELL * R + run] + TIME_STEP;
    }
    workgroupBarrier();
  }
}
`

  const code = [
    prelude,
    instrFns.join('\n\n'),
    dispatcher,
    layerEntryPoints.join('\n'),
    layeredSupport,
    perThread,
    perWorkgroup
  ].join('\n')

  return {
    code,
    table: Uint32Array.from(table),
    lookupDir,
    plan,
    numInstrs: instrs.length,
    numSteps,
    savePointCount,
    stepsPerSave,
    stats: {
      numCells: ir.numCells,
      numInstrs: instrs.length,
      layerCounts: Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.length])),
      workgroupsPerStep:
        plan.evalAux.reduce((a, p) => a + p.count, 0) + plan.evalLevels.reduce((a, p) => a + p.count, 0)
    }
  }
}

/** Return a WGSL float literal for the given value. */
function fl(v) {
  if (Number.isInteger(v) && Math.abs(v) < 1e15) {
    return `${v}.0`
  }
  const s = `${v}`
  return s.includes('.') || s.includes('e') ? s : `${s}.0`
}
