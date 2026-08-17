import { generateC } from './gen-code-c.js'
import { generateJS } from './gen-code-js.js'

/**
 * Generate code from the given parsed model.
 *
 * @param {import('../parse-and-generate.js').ParsedModel} parsedModel The parsed model structure.
 * @param {Object} opts The options that control code generation.
 * @param {import('../model-spec.js').ModelSpec} opts.spec The parsed `spec.json` object.
 * @param {import('../parse-and-generate.js').GenerateOperation[]} opts.operations The array
 * of operations to perform.
 * @param {import('../_shared/read-dat.js').ExtData} [opts.extData] The map of datasets from
 * external `.dat` files.
 * @param {Map<string, any>} [opts.directData] The mapping of dataset name used in a
 * `GET DIRECT DATA` call (e.g., `?data`) to the tabular data contained in the loaded
 * data file.
 * @param {string} [opts.modelDirname] The absolute path to the directory containing data
 * (dat, xlsx, csv) files that are referenced by the model.  This path is used for
 * resolving data files for `GET DIRECT SUBSCRIPT` calls.
 * @param {string} [opts.varname] The variable name passed to the `sde causes` command.
 * @returns {string} A string containing the generated code.
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
