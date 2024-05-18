// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

/**
 * A variable identifier string, as used in SDEverywhere.
 *
 * @hidden This is hidden for now; this will be exposed in a separate set of changes.
 */
export type VarId = string

/** An input variable identifier string, as used in SDEverywhere. */
export type InputVarId = string

/** An output variable identifier string, as used in SDEverywhere. */
export type OutputVarId = string

/** A data point. */
export interface Point {
  /** The x value (typically a time value). */
  x: number
  /** The y value. */
  y: number
}
