// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

/** An input variable identifier string, as used in SDEverywhere. */
export type InputVarId = string

/** An output variable identifier string, as used in SDEverywhere. */
export type OutputVarId = string

/**
 * The variable index values for use with the optional output indices buffer.
 * @hidden This is not yet part of the public API; it is exposed here for use in testing tools.
 */
export interface OutputVarSpec {
  /** The variable index as used in the generated C code. */
  varIndex: number
  /** The subscript index values as used in the generated C code. */
  subscriptIndices?: number[]
}
