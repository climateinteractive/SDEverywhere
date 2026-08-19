// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Build a "flat buffer" intermediate representation of an analyzed SDE model.
//
// The production C and JS code generators emit one (possibly multi-dimensional) variable
// per Vensim variable.  For a GPU backend we instead need every model value to live in a
// single linear buffer so that it can be handed to the device as one storage buffer.  This
// module computes that layout, plus the topological "layers" that say which variables can
// be evaluated concurrently.
//
// Buffer layout
// -------------
// The value buffer is indexed as:
//
//   V[cellIndex * numRuns + runIndex]
//
// where `cellIndex` identifies one scalar slot of one model variable (a variable with
// subscripts `[DimA, DimB]` occupies `size(DimA) * size(DimB)` consecutive cells) and
// `runIndex` identifies one member of an ensemble of concurrently-simulated model runs.
// Interleaving runs in the *minor* position means that adjacent GPU threads (which are
// assigned adjacent run indices) touch adjacent memory, which is what the hardware wants.
// When `numRuns` is 1 this degenerates to a plain flat buffer.
//

import { sub, isDimension, subscriptFamilies } from '../../../packages/compile/src/_shared/subscript.js'

/**
 * Compute the flat buffer layout and evaluation layers for an analyzed model.
 *
 * @param {Object} Model The analyzed `Model` module (see `analyze.mjs`).
 * @return {Object} The model IR.
 */
export function buildIr(Model) {
  //
  // Step 1: allocate a slot range in the flat buffer for each distinct variable name.
  //
  // Note that non-apply-to-all ("separated") variables appear as multiple `Variable`
  // instances that share a single `varName`; they all address the same allocation, so we
  // size the allocation using the subscript *families* (exactly like the C declaration
  // section does).
  //
  const alloc = new Map()
  let nextOffset = 0

  function allocateFor(v) {
    if (alloc.has(v.varName)) {
      return alloc.get(v.varName)
    }
    const families = subscriptFamilies(v.subscripts)
    const dimSizes = families.map(f => sub(f).size)
    // Row-major strides over the family sizes
    const strides = new Array(dimSizes.length)
    let stride = 1
    for (let i = dimSizes.length - 1; i >= 0; i--) {
      strides[i] = stride
      stride *= dimSizes[i]
    }
    const size = stride
    const a = { varName: v.varName, offset: nextOffset, size, families, dimSizes, strides }
    nextOffset += size
    alloc.set(v.varName, a)
    return a
  }

  // Allocate value slots for everything except lookup/data variables (those get their
  // points packed into a separate buffer below).
  for (const v of Model.allVars()) {
    if (v.isLookup() || v.isData()) {
      continue
    }
    allocateFor(v)
  }
  // The `Time` variable is synthesized by the model reader and always needs a slot
  if (!alloc.has('_time')) {
    alloc.set('_time', { varName: '_time', offset: nextOffset++, size: 1, families: [], dimSizes: [], strides: [] })
  }

  const numCells = nextOffset

  //
  // Step 2: pack lookup data.
  //
  // Every lookup instance (one per subscript combination for a subscripted lookup) gets a
  // contiguous run of (x,y) pairs in a second buffer.  A small directory buffer maps the
  // lookup's flat cell index to (dataOffset, numPoints) so that generated code can do
  // `lookup(cellIndexOf(_my_lookup), x)`.
  //
  const lookupAlloc = new Map()
  const lookupData = []
  let lookupDirSize = 0

  for (const v of Model.allVars()) {
    if (!v.isLookup() && !v.isData()) {
      continue
    }
    let a = lookupAlloc.get(v.varName)
    if (a === undefined) {
      const families = subscriptFamilies(v.subscripts)
      const dimSizes = families.map(f => sub(f).size)
      const strides = new Array(dimSizes.length)
      let stride = 1
      for (let i = dimSizes.length - 1; i >= 0; i--) {
        strides[i] = stride
        stride *= dimSizes[i]
      }
      a = {
        varName: v.varName,
        dirOffset: lookupDirSize,
        size: stride,
        families,
        dimSizes,
        strides,
        entries: new Map()
      }
      lookupDirSize += stride
      lookupAlloc.set(v.varName, a)
    }
    if (v.points.length === 0) {
      throw new Error(`Unsupported: lookup/data variable '${v.refId}' has no inline data points`)
    }
    // Compute the flat cell index for this instance from its (fully specific) subscripts
    let cell = 0
    v.subscripts.forEach((subId, i) => {
      if (isDimension(subId)) {
        throw new Error(`Unsupported: partially apply-to-all lookup '${v.refId}'`)
      }
      cell += sub(subId).value * a.strides[i]
    })
    a.entries.set(cell, { dataOffset: lookupData.length / 2, numPoints: v.points.length })
    for (const [x, y] of v.points) {
      lookupData.push(x, y)
    }
  }

  //
  // Step 3: group the variables of each evaluation pass into topological layers.
  //
  const varsByRefId = new Map()
  for (const v of Model.allVars()) {
    varsByRefId.set(v.refId, v)
  }

  function layersFor(vars, depsOf) {
    const layerOfRefId = new Map()
    const layers = []
    for (const v of vars) {
      let layer = 0
      for (const depRefId of depsOf(v)) {
        const depLayer = layerOfRefId.get(depRefId)
        if (depLayer !== undefined) {
          layer = Math.max(layer, depLayer + 1)
        }
      }
      // A separated variable contributes several instances under one `varName`; instances
      // of the same name must not land in the same layer as an instance that reads it.
      layerOfRefId.set(v.refId, layer)
      if (layers[layer] === undefined) {
        layers[layer] = []
      }
      layers[layer].push(v)
    }
    return layers
  }

  const evalDeps = v => v.references
  const initDeps = v => (v.hasInitValue ? v.initReferences : v.references)

  const constVars = Model.constVars()
  const initVars = Model.initVars()
  const auxVars = Model.auxVars()
  const levelVars = Model.levelVars()

  return {
    Model,
    alloc,
    numCells,
    lookupAlloc,
    lookupDirSize,
    lookupData: Float32Array.from(lookupData),
    lookupDataF64: Float64Array.from(lookupData),
    varsByRefId,
    passes: {
      // Constants have no interdependencies that matter (SDE has already reduced them),
      // but we layer them anyway for safety.
      initConstants: layersFor(constVars, initDeps),
      initLevels: layersFor(initVars, initDeps),
      evalAux: layersFor(auxVars, evalDeps),
      evalLevels: layersFor(levelVars, evalDeps)
    },
    varLists: { constVars, initVars, auxVars, levelVars }
  }
}

/**
 * Return the flat cell index (within one run's slice of the value buffer) for a fully
 * specific variable reference such as `_a[_a2,_b1]`.
 *
 * @param {Object} ir The model IR.
 * @param {string} varName The canonical variable name.
 * @param {string[]} subIds The array of specific subscript IDs (may be empty).
 * @return {number} The flat cell index.
 */
export function cellIndexFor(ir, varName, subIds = []) {
  const a = ir.alloc.get(varName)
  if (a === undefined) {
    throw new Error(`No allocation for variable '${varName}'`)
  }
  let cell = a.offset
  subIds.forEach((subId, i) => {
    cell += sub(subId).value * a.strides[i]
  })
  return cell
}
