// Copyright (c) 2022 Climate Interactive / New Venture Fund

//
// Note that the types below are declared (as JSDoc typedefs) alongside the code that
// defines and uses them.  We use `export *` here rather than re-declaring each typedef
// so that the generated declarations refer to a single definition of each type.
//
export * from './_shared/model-spec.js'

// XXX: For now we re-export the preprocess function from the parse package
// mainly for use by the cli package (so that we don't need to have the cli
// package directly depend on the parse package)
export { preprocessVensimModel } from '@sdeverywhere/parse'

export { canonicalName } from './_shared/helpers.js'
export * from './_shared/read-dat.js'
export { generateCode } from './generate/gen-code.js'
export * from './parse-and-generate.js'

import { resetHelperState } from './_shared/helpers.js'
import { resetSubscriptsAndDimensions } from './_shared/subscript.js'
import Model from './model/model.js'
import { parseModel } from './parse-and-generate.js'

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
export function resetState() {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()
}

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 *
 * @param {string} mdlContent The string containing the Vensim model text.
 * @param {string} [modelDir] The absolute path to the directory containing data files.
 * @return {import('./parse-and-generate.js').ParsedModel} A parsed tree representation of the model.
 */
export function parseInlineVensimModel(mdlContent, modelDir) {
  // For tests that parse inline model text, in the case of the legacy parser, don't run
  // the preprocess step, and in the case of the new parser (which implicitly runs the
  // preprocess step), don't sort the definitions.  This makes it easier to do apples
  // to apples comparisons on the outputs from the two parser implementations.
  return parseModel(mdlContent, 'vensim', modelDir, { sort: false })
}

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 *
 * @param {string} mdlContent The string containing the XMILE model text.
 * @param {string} [modelDir] The absolute path to the directory containing data files.
 * @return {import('./parse-and-generate.js').ParsedModel} A parsed tree representation of the model.
 */
export function parseInlineXmileModel(mdlContent, modelDir) {
  return parseModel(mdlContent, 'xmile', modelDir)
}

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
export function getModelListing() {
  return Model.jsonList()
}
