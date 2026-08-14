// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Note that the compile package publishes its JavaScript sources directly (there is no
// build step that emits declarations), so the type declarations for the public API are
// maintained by hand in this file.  Keep this file in sync with `index.js`.
//

import type { Model } from '@sdeverywhere/parse'
import type { ModelSpec, VarId } from './model-spec.js'

export type { PreprocessedVensimModel } from '@sdeverywhere/parse'
export { preprocessVensimModel } from '@sdeverywhere/parse'

export type { DatFileSpec, DimId, ModelSpec, VarId, VarName } from './model-spec.js'

/** The kind of model that is being parsed. */
export type ModelKind = 'vensim' | 'xmile'

/**
 * A parsed tree representation of a model, along with the kind of model that
 * was parsed.
 */
export interface ParsedModel {
  /** The kind of model that was parsed. */
  kind: ModelKind

  /** The root of the parsed model AST. */
  root: Model
}

/**
 * An operation that can be performed by `parseAndGenerate`.
 *
 * - `generateC` writes the generated C code to the build directory.
 * - `generateJS` writes the generated JS code to the build directory.
 * - `printVarList` writes variables and subscripts to txt and json files under
 *   the build directory.
 * - `printRefIdTest` prints reference identifiers to the console.
 * - `printRefGraph` prints the variable dependency graph to the console.
 * - `convertNames` generates no output, but makes the results of model analysis
 *   available.
 */
export type GenerateOperation =
  | 'generateC'
  | 'generateJS'
  | 'printVarList'
  | 'printRefIdTest'
  | 'printRefGraph'
  | 'convertNames'

/**
 * The datasets read from external `dat` files, keyed by variable identifier.  Each
 * dataset is a map of time to value.
 */
export type ExtData = Map<VarId, Map<number, number>>

/**
 * The tabular data read from Excel workbooks, keyed by the data tag used in a
 * `GET DIRECT {DATA,CONSTANTS,LOOKUPS}` call (for example, `?data`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DirectData = Map<string, any>

/**
 * Convert the given variable name to the canonical identifier format used
 * internally by SDEverywhere.
 *
 * @param name The variable name as used in the modeling tool.
 * @returns The canonical variable identifier.
 */
export function canonicalName(name: string): VarId

/**
 * Read a Vensim `dat` file with static data and return the datasets.
 *
 * Each dataset consists of a key (the variable name in the canonical format used
 * by SDE) and a map of time/value pairs.
 *
 * @param pathname The absolute path to the dat file.
 * @param prefix An optional prefix string prepended to variable names.
 * @returns A promise that resolves with a map containing the datasets.
 */
export function readDat(pathname: string, prefix?: string): Promise<ExtData>

/** The options that control code generation. */
export interface GenerateCodeOptions {
  /** The model spec (as parsed from a `spec.json` file). */
  spec: ModelSpec

  /** The set of operations to perform. */
  operations: GenerateOperation[]

  /** The map of datasets from external `dat` files. */
  extData?: ExtData

  /** The tabular data loaded from Excel workbooks. */
  directData?: DirectData

  /**
   * The absolute path to the directory containing data (dat, xlsx, csv) files that
   * are referenced by the model.
   */
  modelDirname?: string

  /** The variable name passed to the `sde causes` command. */
  varname?: string
}

/**
 * Generate code from the given parsed model.
 *
 * @param parsedModel The parsed model structure.
 * @param opts The options that control code generation.
 * @returns A string containing the generated code.
 */
export function generateCode(parsedModel: ParsedModel, opts: GenerateCodeOptions): string

/**
 * Parse a Vensim or XMILE model and generate C or JS code.
 *
 * This is the primary entrypoint for the `sde generate` command.
 *
 * @param input The preprocessed Vensim or XMILE model text.
 * @param modelKind The kind of model to parse.
 * @param spec The model spec (as parsed from a `spec.json` file).
 * @param operations The set of operations to perform.  If the array is empty, the
 * model will be read but no operation will be performed.
 * @param modelDirname The absolute path to the directory containing data (dat, xlsx,
 * csv) files that are referenced by the model.  These files will be resolved relative
 * to this directory.
 * @param modelName The model name (without the mdl extension).
 * @param buildDir The output directory where the C or list files will be written.
 * @param varname The variable name passed to the `sde causes` command.
 * @returns A promise that resolves with a string containing the generated code.
 */
export function parseAndGenerate(
  input: string,
  modelKind: ModelKind,
  spec: ModelSpec,
  operations: GenerateOperation[],
  modelDirname: string,
  modelName: string,
  buildDir: string,
  varname?: string
): Promise<string>

/**
 * Read and parse the given model text and return the parsed model structure.
 *
 * @param input The string containing the model text.
 * @param modelKind The kind of model to parse.
 * @param modelDir The absolute path to the directory containing data (dat, xlsx, csv)
 * files that are referenced by the model.  These files will be resolved relative to
 * this directory.
 * @param options The options that control parsing.
 * @returns A parsed tree representation of the model.
 */
export function parseModel(
  input: string,
  modelKind: ModelKind,
  modelDir?: string,
  options?: { sort?: boolean }
): ParsedModel

/**
 * Read the variable names from the given file, convert them to their C or Vensim
 * representation, and print the results to the console.
 *
 * This is used only to implement the `sde names` command.
 *
 * @param namesPathname The path to the file containing variable names.
 * @param operation Either 'to-c' or 'to-vensim'.
 */
export function printNames(namesPathname: string, operation: 'to-c' | 'to-vensim'): void

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
export function resetState(): void

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
export function parseInlineVensimModel(mdlContent: string, modelDir?: string): ParsedModel

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
export function parseInlineXmileModel(mdlContent: string, modelDir?: string): ParsedModel

/**
 * @hidden This is not yet part of the public API; it is exposed only for use
 * in the experimental playground app.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModelListing(): { full: any; minimal: any }
