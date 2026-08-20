// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// A synthetic model built to match the measured structure of the Energy Policy Simulator.
//
// The shape here is not invented.  It comes from running SDE's parser and variable reader
// over the EPS revision that jrissman pointed at in issue #319 (the one that simulates all
// 8760 hours per year, eps-us @ 2e3acf8), and measuring:
//
//   - the simulation window: 2020-2050 with TIME STEP = 1, i.e. only 31 time steps
//   - 77 dependency layers per time step
//   - 2,790,056 variable-cell evaluations per time step
//   - the width (cells that can be evaluated concurrently) of each of those 77 layers
//   - the subscript shapes that carry the work, using the real dimension sizes
//
// See `inspect.mjs` for the measurement.  What this generator reproduces is the *work
// profile* - how much independent work exists at each point in the dependency chain - which
// is what determines whether a GPU can help.  It does not reproduce the EPS's actual
// equations, its ~1800 distinct per-step variable names (this uses fewer, wider variables
// for the same total cell count), its lookup tables, or its external data.
//

/**
 * The measured per-layer width of the EPS, in cells that can be evaluated concurrently.
 * Index is dependency depth; value is the number of independent cell evaluations at that
 * depth.  Sums to 2,790,056 across 77 layers.
 */
export const EPS_LAYER_WIDTHS = [
  54009, 158712, 151796, 4015, 3395, 6277, 3719, 5215, 27302, 31324, 30135, 26909, 54813, 171983, 21435, 157398, 157810,
  4428, 1229, 1985, 787, 478, 5349, 1786, 6714, 2300, 2297, 1036, 945, 2873, 3860, 2909, 2607, 2533, 4895, 172, 142,
  890, 1712, 842, 1682, 843, 3332, 1855, 41, 43, 181, 8816, 8857, 71, 20, 98, 18, 1, 17, 17, 17, 17, 17, 17, 51, 34, 17,
  8761, 44530, 367430, 376099, 350404, 310141, 159610, 9734, 4918, 3691, 8540, 967, 151, 2
]

/**
 * The subscript shapes that carry the EPS's per-time-step work, with the real dimension
 * sizes, largest first.
 */
const SHAPES = [
  { name: 'esdh', dims: ['Electricity Source', 'Day', 'Hour'], cells: 17 * 365 * 24 },
  { name: 'icpp', dims: ['Industry Category', 'Policy', 'Pollutant'], cells: 25 * 86 * 12 },
  { name: 'dh', dims: ['Day', 'Hour'], cells: 365 * 24 },
  { name: 'esv', dims: ['Electricity Source', 'Vintage'], cells: 17 * 210 },
  { name: 'icp', dims: ['Industry Category', 'Policy'], cells: 25 * 86 },
  { name: 'veh', dims: ['Vehicle Type', 'Cargo Type', 'Vehicle Tech', 'Transport Fuel'], cells: 6 * 2 * 7 * 10 },
  { name: 'pes', dims: ['Pollutant', 'Electricity Source'], cells: 12 * 17 },
  { name: 'es', dims: ['Electricity Source'], cells: 17 },
  { name: 'scalar', dims: [], cells: 1 }
]

const DIM_SIZES = {
  'Electricity Source': 17,
  Day: 365,
  Hour: 24,
  'Industry Category': 25,
  Policy: 86,
  Pollutant: 12,
  Vintage: 210,
  'Vehicle Type': 6,
  'Cargo Type': 2,
  'Vehicle Tech': 7,
  'Transport Fuel': 10
}

/**
 * Choose a set of variable shapes whose cell counts sum to (approximately) `width`.
 *
 * Each shape is used at most `maxPerShape` times before moving to a smaller one, which
 * keeps a wide layer from becoming a single enormous variable and roughly reproduces the
 * EPS's mix of a few very wide variables plus a tail of narrow ones.
 *
 * @param {number} width The target number of cells for this layer.
 * @param {number} maxPerShape The maximum number of variables to emit per shape.
 * @return {Object[]} The chosen shapes, one entry per variable.
 */
function fillLayer(width, maxPerShape = 64, maxScalars = 8) {
  const chosen = []
  let remaining = width
  for (const shape of SHAPES) {
    if (shape.cells > remaining || shape.cells === 1) {
      continue
    }
    const n = Math.min(maxPerShape, Math.floor(remaining / shape.cells))
    for (let i = 0; i < n; i++) {
      chosen.push(shape)
    }
    remaining -= n * shape.cells
    if (remaining === 0) {
      break
    }
  }
  // Absorb only a small remainder as scalars; emitting one variable per leftover cell would
  // produce thousands of trivial equations that dominate compile time without adding work
  const scalar = SHAPES[SHAPES.length - 1]
  for (let i = 0; i < Math.min(remaining, maxScalars); i++) {
    chosen.push(scalar)
  }
  return chosen.length > 0 ? chosen : [scalar]
}

/**
 * Generate a Vensim model whose per-time-step work profile matches the measured EPS profile.
 *
 * The construction is:
 *   - one stock per shape, so that layer 0 reads accumulated state
 *   - a scalar "spine" variable per layer; every variable at depth d reads the spine at
 *     depth d-1, which pins each variable to its intended dependency depth
 *   - each variable also reads the nearest earlier variable of its own shape, so the
 *     subscripted arithmetic is element-wise across the real dimensions
 *   - `SUM` roll-ups over the hourly dimensions at the end, matching the pattern jrissman
 *     described ("there is usually a SUM function at the end")
 *
 * @param {Object} [opts] The generation options.
 * @param {number[]} [opts.layerWidths] The per-layer widths to reproduce.
 * @param {number} [opts.startTime] The simulation start time.
 * @param {number} [opts.finalTime] The simulation end time.
 * @param {number} [opts.widthScale] Scale factor applied to every layer width, for sweeping
 * a smaller or larger version of the same shape.
 * @return {Object} The model text plus the names of some representative output variables.
 */
export function epsShapedModel({
  layerWidths = EPS_LAYER_WIDTHS,
  startTime = 2020,
  finalTime = 2050,
  widthScale = 1
} = {}) {
  const lines = ['{UTF-8}']

  // Dimension definitions, using the real EPS dimension sizes
  for (const [dim, size] of Object.entries(DIM_SIZES)) {
    const prefix = dim.replace(/[^A-Za-z]/g, '').slice(0, 4)
    lines.push(`${dim}: (${prefix}1-${prefix}${size}) ~~|`)
  }

  lines.push(`INITIAL TIME = ${startTime} ~~|`)
  lines.push(`FINAL TIME = ${finalTime} ~~|`)
  lines.push('TIME STEP = 1 ~~|')
  lines.push('SAVEPER = 1 ~~|')
  lines.push('policy lever = 1 ~~|')

  const subs = shape => (shape.dims.length === 0 ? '' : `[${shape.dims.join(', ')}]`)

  // One stock per shape; these are the roots of the dependency graph
  const stockOf = new Map()
  for (const shape of SHAPES) {
    const name = `stock ${shape.name}`
    stockOf.set(shape.name, name)
    lines.push(`${name}${subs(shape)} = INTEG(flow ${shape.name}${subs(shape)}, 100) ~~|`)
  }

  // The spine pins each layer to its intended depth
  lines.push('spine 0 = stock scalar * 0.5 + policy lever ~~|')

  // The most recent layer's variables for each shape.  A new variable reads all of them, so
  // that every emitted variable stays live (SDE prunes variables that no output depends on)
  // and the graph has the fan-in that a real model has.
  const lastOfShape = new Map(SHAPES.map(s => [s.name, null]))
  const perShapeCount = new Map(SHAPES.map(s => [s.name, 0]))
  const sinkNames = []
  let varCount = 0

  // One element of each dimension, for the cheap per-layer "sink" references below
  const firstElem = shape =>
    shape.dims.length === 0 ? '' : `[${shape.dims.map(d => `${d.replace(/[^A-Za-z]/g, '').slice(0, 4)}1`).join(', ')}]`

  layerWidths.forEach((rawWidth, depth) => {
    const width = Math.max(1, Math.round(rawWidth * widthScale))
    if (depth > 0) {
      lines.push(`spine ${depth} = spine ${depth - 1} * 1.0001 + 0.001 ~~|`)
    }
    // All variables in a layer must be mutually independent, so they read the last
    // variable of their shape from an *earlier* layer; `lastOfShape` is only advanced once
    // the whole layer has been emitted.
    const emitted = new Map()
    const layerVars = []
    for (const shape of fillLayer(width)) {
      const n = perShapeCount.get(shape.name)
      perShapeCount.set(shape.name, n + 1)
      const name = `v ${shape.name} ${n}`
      const prev = lastOfShape.get(shape.name)
      // Fan in from at most a few predecessors; reading an entire wide layer would make the
      // equations (and the reference graph) blow up without changing the work profile
      const prevRefs =
        prev === null ? [`${stockOf.get(shape.name)}${subs(shape)}`] : prev.slice(0, 3).map(p => `${p}${subs(shape)}`)
      const head = prevRefs[0]
      const tail = prevRefs.length > 1 ? ` + ${prevRefs.slice(1).join(' * 0.01 + ')} * 0.01` : ''
      lines.push(
        `${name}${subs(shape)} = ${head} * 0.5 + SQRT(ABS(${head})) * 0.01${tail} + spine ${depth} * 0.001 ~~|`
      )
      const group = emitted.get(shape.name) || []
      group.push(name)
      emitted.set(shape.name, group)
      layerVars.push({ name, shape })
      varCount++
    }
    for (const [shapeName, group] of emitted) {
      lastOfShape.set(shapeName, group)
    }

    // A cheap sink that reads one element of every variable emitted at this depth.  SDE
    // prunes variables that no output depends on, and a layer is usually wider than the
    // next layer's fan-in, so without this most of the model would be dropped.
    const sinkRefs = layerVars.map(({ name, shape }) => `${name}${firstElem(shape)}`)
    const sinkName = `sink ${depth}`
    lines.push(`${sinkName} = ${sinkRefs.join(' + ')} ~~|`)
    sinkNames.push(sinkName)
  })

  // Roll-ups: reduce the hourly detail to annual totals, then feed the stocks.  At reduced
  // width some shapes never appear, so each roll-up is emitted only if its shape was used.
  const rollups = []
  const rollup = (name, shapeName, markedDims) => {
    const group = lastOfShape.get(shapeName)
    if (group === null) {
      return
    }
    lines.push(`${name} = SUM(${group[0]}[${markedDims.join(', ')}]) ~~|`)
    rollups.push(name)
  }
  rollup('annual electricity', 'esdh', ['Electricity Source!', 'Day!', 'Hour!'])
  rollup('annual hourly load', 'dh', ['Day!', 'Hour!'])
  rollup('annual industry', 'icpp', ['Industry Category!', 'Policy!', 'Pollutant!'])

  lines.push(`layer total = ${sinkNames.join(' + ')} ~~|`)
  lines.push(`total = layer total${rollups.map(r => ` + ${r}`).join('')} ~~|`)

  for (const shape of SHAPES) {
    const last = lastOfShape.get(shape.name)
    const src = last === null ? `${stockOf.get(shape.name)}${subs(shape)}` : `${last[0]}${subs(shape)}`
    lines.push(`flow ${shape.name}${subs(shape)} = (${src} - ${stockOf.get(shape.name)}${subs(shape)}) * 0.05 ~~|`)
  }

  return {
    mdlText: lines.join('\n') + '\n',
    varCount,
    layerCount: layerWidths.length,
    totalCellsPerStep: layerWidths.reduce((a, w) => a + Math.max(1, Math.round(w * widthScale)), 0),
    // A representative output set: the annual roll-ups plus a per-source series
    outputVarNames: ['total', ...rollups]
  }
}
