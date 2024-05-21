import { generateC } from './gen-code-c'
import { generateJS } from './gen-code-js'

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
 * @param {string} opts.modelDirname The path to the directory containing the model
 * (used for resolving data files for `GET DIRECT SUBSCRIPT`).
 * @returns A string containing the generated code.
 */
export function generateCode(parsedModel, opts) {
  // Note that the two `generate` functions perform the same steps (other than the
  // difference in output format), so we will use `generateJS` if JS is requested
  // as the output format, otherwise we will use `generateC`.
  // TODO: For now we only allow for either generateJS or generateC, but not both at
  // the same time.  Maybe we should make it possible to generate both with a single
  // call.
  if (opts.operations.includes('generateJS')) {
    return generateJS(parsedModel, opts)
  } else {
    return generateC(parsedModel, opts)
  }
}
