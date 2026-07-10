import { resetHelperState } from '../_shared/helpers.js'
import { resetSubscriptsAndDimensions } from '../_shared/subscript.js'
import Model from '../model/model.js'

import { generateC } from './gen-code-c.js'
import { generateJS } from './gen-code-js.js'

/**
 * Generate code from the given parsed model.
 *
 * @param {*} parsedModel The parsed model structure.
 * @param {Object} opts The options that control code generation.
 * @param {Object} opts.spec The parsed `spec.json` object.
 * @param {string[]} opts.operations The array of operations to perform.
 * - If it has 'generateC', the generated C code will be written to `buildDir`.
 * - If it has 'generateJS', the generated JS code will be written to `buildDir`.
 * - If it has 'printRefIdTest', reference identifiers will be printed to the console.
 * - If it has 'convertNames', no output will be generated, but the results of model
 *   analysis will be available.
 * @param {Map<string, any>} opts.extData The map of datasets from external `.dat` files.
 * @param {Map<string, any>} opts.directData The mapping of dataset name used in a
 * `GET DIRECT DATA` call (e.g., `?data`) to the tabular data contained in the loaded
 * data file.
 * @param {string} opts.modelDirname The absolute path to the directory containing data
 * (dat, xlsx, csv) files that are referenced by the model.  This path is used for
 * resolving data files for `GET DIRECT SUBSCRIPT` calls.
 * @returns A string containing the generated code.
 */
export function generateCode(parsedModel, opts) {
  // Note that the two `generate` functions perform the same steps (other than the
  // difference in output format), so we will use `generateJS` if JS is requested
  // as the output format, otherwise we will use `generateC`.
  // TODO: For now we only allow for either generateJS or generateC, but not both at
  // the same time.  Maybe we should make it possible to generate both with a single
  // call.
  const generate = () => {
    if (opts.operations.includes('generateJS')) {
      return generateJS(parsedModel, opts)
    } else {
      return generateC(parsedModel, opts)
    }
  }

  // A dependency cycle detected during toposort can be a false cycle caused by a
  // variable that keeps a dimension for which its references are defined element by
  // element (see `separationCandidatesForCycle` in model.js).  When a cycle is
  // detected, add the separation dims proposed by the cycle analysis to the spec
  // (as if they had been listed in `specialSeparationDims` in the spec file) and
  // retry code generation.
  const maxAttempts = 20
  for (let attempt = 1; ; attempt++) {
    try {
      return generate()
    } catch (e) {
      if (!e.cycles || !opts.spec || attempt >= maxAttempts) {
        throw e
      }
      if (process.env.SDE_PRINT_CYCLES === '1') {
        console.error(`Cycle found on attempt ${attempt}:\n${e.cycle.join(' →\n')}\n`)
      }
      // Find variables in the cycle clusters that can be separated to break the cycles
      const candidates = Model.separationCandidatesForCycles(e.cycles, e.outgoingEdges)
      const specialSeparationDims = opts.spec.specialSeparationDims || {}
      let addedDims = false
      for (const [varName, dimIds] of candidates) {
        let dims = specialSeparationDims[varName] || []
        if (!Array.isArray(dims)) {
          dims = [dims]
        }
        for (const dimId of dimIds) {
          if (!dims.includes(dimId)) {
            dims.push(dimId)
            addedDims = true
            console.error(`Breaking a dependency cycle by separating ${varName} on dimension ${dimId}`)
          }
        }
        specialSeparationDims[varName] = dims
      }
      if (!addedDims) {
        // The cycle analysis did not find any new separations, so the cycle cannot
        // be broken this way; report it to the user
        throw e
      }
      opts.spec.specialSeparationDims = specialSeparationDims
      // Reset the model state and retry code generation with the added separations
      resetHelperState()
      resetSubscriptsAndDimensions()
      Model.resetModelState()
    }
  }
}
