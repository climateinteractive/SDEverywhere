// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Generators for synthetic Vensim models with controllable shape.
//
// Real SD models vary along two axes that matter enormously for GPU execution:
//
//   width - how many independent values are computed at the same point in the dependency
//           graph (subscript elements, independent sectors).  This is the only intra-run
//           parallelism a GPU can exploit.
//   depth - how many dependency layers must be evaluated in sequence within one time step.
//           This is pure serial work; it cannot be parallelized within a single run.
//
// The generators below let the benchmark sweep both axes independently, plus the number of
// time steps.
//

/**
 * Generate a "wide" model: one dimension of `width` elements with a chain of `depth`
 * element-wise aux variables feeding a stock, in the shape of a sectoral model such as the
 * Energy Policy Simulator (independent per-element calculations plus a `SUM` roll-up).
 *
 * @param {Object} opts The model shape options.
 * @param {number} opts.width The number of elements in the subscript dimension.
 * @param {number} opts.depth The number of chained aux variables per element.
 * @param {number} opts.finalTime The simulation end time (time step is 1).
 * @return {string} The Vensim model text.
 */
export function wideModel({ width, depth, finalTime }) {
  const lines = ['{UTF-8}']
  lines.push(`DimS: (S1-S${width}) ~~|`)
  lines.push('INITIAL TIME = 0 ~~|')
  lines.push(`FINAL TIME = ${finalTime} ~~|`)
  lines.push('TIME STEP = 1 ~~|')
  lines.push(`SAVEPER = ${finalTime} ~~|`)
  lines.push('growth = 1 ~~|')
  lines.push('stock[DimS] = INTEG(net flow[DimS], 100) ~~|')
  lines.push('a0[DimS] = stock[DimS] * 0.5 + growth ~~|')
  for (let i = 1; i < depth; i++) {
    // Mix cheap and transcendental operations so the arithmetic is not trivially optimized
    lines.push(`a${i}[DimS] = a${i - 1}[DimS] * 1.001 + SQRT(ABS(a${i - 1}[DimS])) * 0.01 ~~|`)
  }
  lines.push(`net flow[DimS] = (a${depth - 1}[DimS] - stock[DimS]) * 0.05 ~~|`)
  lines.push('total = SUM(stock[DimS!]) ~~|')
  return lines.join('\n') + '\n'
}

/**
 * Generate a "scalar" model: `numVars` unsubscripted aux variables arranged into `depth`
 * dependency layers, in the shape of a conventional (non-vectorized) SD model.
 *
 * @param {Object} opts The model shape options.
 * @param {number} opts.numVars The total number of aux variables.
 * @param {number} opts.depth The number of dependency layers.
 * @param {number} opts.finalTime The simulation end time (time step is 1).
 * @return {string} The Vensim model text.
 */
export function scalarModel({ numVars, depth, finalTime }) {
  const perLayer = Math.max(1, Math.floor(numVars / depth))
  const lines = ['{UTF-8}']
  lines.push('INITIAL TIME = 0 ~~|')
  lines.push(`FINAL TIME = ${finalTime} ~~|`)
  lines.push('TIME STEP = 1 ~~|')
  lines.push(`SAVEPER = ${finalTime} ~~|`)
  lines.push('stock = INTEG(net flow, 100) ~~|')
  const prevLayer = []
  for (let n = 0; n < perLayer; n++) {
    lines.push(`v0x${n} = stock * ${(0.5 + n / perLayer).toFixed(4)} + 1 ~~|`)
    prevLayer.push(`v0x${n}`)
  }
  let last = prevLayer.slice()
  for (let d = 1; d < depth; d++) {
    const layer = []
    for (let n = 0; n < perLayer; n++) {
      const a = last[n % last.length]
      const b = last[(n + 1) % last.length]
      lines.push(`v${d}x${n} = ${a} * 0.5 + SQRT(ABS(${b})) * 0.01 ~~|`)
      layer.push(`v${d}x${n}`)
    }
    last = layer
  }
  lines.push(`net flow = (${last[0]} - stock) * 0.05 ~~|`)
  return lines.join('\n') + '\n'
}

/**
 * Generate a model shaped like En-ROADS for the memory/readback experiment: several hundred
 * unsubscripted variables, a sub-annual time step, and annual save points over ~110 years.
 *
 * @param {Object} opts The model shape options.
 * @param {number} opts.numVars The total number of aux variables.
 * @param {number} opts.depth The number of dependency layers.
 * @param {number} opts.startTime The simulation start time.
 * @param {number} opts.finalTime The simulation end time.
 * @param {number} opts.timeStep The time step (save frequency is fixed at 1).
 * @return {string} The Vensim model text.
 */
export function enroadsShapedModel({ numVars, depth, startTime, finalTime, timeStep }) {
  const perLayer = Math.max(1, Math.ceil(numVars / depth))
  const lines = ['{UTF-8}']
  lines.push(`INITIAL TIME = ${startTime} ~~|`)
  lines.push(`FINAL TIME = ${finalTime} ~~|`)
  lines.push(`TIME STEP = ${timeStep} ~~|`)
  lines.push('SAVEPER = 1 ~~|')
  lines.push('policy = 1 ~~|')
  lines.push('stock = INTEG(net flow, 100) ~~|')
  let last = []
  for (let n = 0; n < perLayer; n++) {
    lines.push(`v0x${n} = stock * ${(0.5 + n / perLayer).toFixed(4)} + policy ~~|`)
    last.push(`v0x${n}`)
  }
  for (let d = 1; d < depth; d++) {
    const layer = []
    for (let n = 0; n < perLayer; n++) {
      const a = last[n % last.length]
      const b = last[(n + 1) % last.length]
      lines.push(`v${d}x${n} = ${a} * 0.5 + SQRT(ABS(${b})) * 0.01 ~~|`)
      layer.push(`v${d}x${n}`)
    }
    last = layer
  }
  lines.push(`net flow = (${last[0]} - stock) * 0.05 ~~|`)
  return lines.join('\n') + '\n'
}
