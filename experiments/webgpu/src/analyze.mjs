// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Thin wrapper around the `@sdeverywhere/compile` model reader.  This runs the normal
// SDE parse + analyze phases and hands back the analyzed `Model` module so that the
// experimental code generators in this directory can walk the same variable lists
// (and the same parsed equation ASTs) that the production C/JS code generators use.
//

import { parseModel, resetState } from '../../../packages/compile/src/index.js'
import Model from '../../../packages/compile/src/model/model.js'

/**
 * Parse and analyze the given Vensim model text.
 *
 * @param {string} mdlText The Vensim model text.
 * @param {Object} [spec] The model spec (as would normally be read from a `spec.json` file).
 * @param {string} [modelDir] The directory used to resolve external data files.
 * @return {Object} The analyzed `Model` module.
 */
export function analyzeVensimModel(mdlText, spec = {}, modelDir = undefined) {
  resetState()
  const parsed = parseModel(mdlText, 'vensim', modelDir)
  Model.read(parsed, spec, new Map(), new Map(), modelDir)
  return Model
}
