// Copyright (c) 2022 Climate Interactive / New Venture Fund

//
// Re-export the types that are part of the public API.  Note that these are defined
// alongside the code that uses them (as JSDoc typedefs) and are re-exported here so
// that they are visible to consumers of this package.
//
/** @typedef {import('./_shared/model-spec.js').VarName} VarName */
/** @typedef {import('./_shared/model-spec.js').VarId} VarId */
/** @typedef {import('./_shared/model-spec.js').DimId} DimId */
/** @typedef {import('./_shared/model-spec.js').DatFileSpec} DatFileSpec */
/** @typedef {import('./_shared/model-spec.js').ModelSpec} ModelSpec */
/** @typedef {import('./parse-and-generate.js').ModelKind} ModelKind */
/** @typedef {import('./parse-and-generate.js').ParsedModel} ParsedModel */
/** @typedef {import('./parse-and-generate.js').GenerateOperation} GenerateOperation */
/** @typedef {import('./_shared/read-dat.js').ExtData} ExtData */

// XXX: For now we re-export the preprocess function from the parse package
// mainly for use by the cli package (so that we don't need to have the cli
// package directly depend on the parse package)
export { preprocessVensimModel } from '@sdeverywhere/parse'

export { canonicalName } from './_shared/helpers.js'
export { readDat } from './_shared/read-dat.js'
export { generateCode } from './generate/gen-code.js'
export { parseAndGenerate, parseModel, printNames } from './parse-and-generate.js'

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
 * @return {ParsedModel} A parsed tree representation of the model.
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
 * @return {ParsedModel} A parsed tree representation of the model.
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
