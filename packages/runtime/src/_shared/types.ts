// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

/** A variable name, as used in the modeling tool. */
export type VarName = string

/** A variable identifier, as used in model code generated by SDEverywhere. */
export type VarId = string

/** An input variable identifier, as used in model code generated by SDEverywhere. */
export type InputVarId = string

/** An output variable identifier, as used in model code generated by SDEverywhere. */
export type OutputVarId = string

/**
 * The variable index metadata that is used to identify a specific instance of a
 * variable in a generated model.
 *
 * @hidden This is not yet part of the public API.
 */
export interface VarSpec {
  /** The variable index as used in the generated C/JS code. */
  varIndex: number
  /** The subscript index values as used in the generated C/JS code. */
  subscriptIndices?: number[]
}

/**
 * A reference to a variable in the generated model.  A variable can be identified
 * using either a `VarName` (the variable name, as used in the modeling tool) or a
 * `VarId` (the variable identifier, as used in model code generated by SDEverywhere).
 */
export interface VarRef {
  /**
   * The name of the variable, as used in the modeling tool.  If defined, the implementation
   * will use this to identify the variable, and will ignore the `varId` property.
   */
  varName?: VarName

  /**
   * The identifier of the variable, as used in model code generated by SDEverywhere.  If
   * defined, the implementation will use this to identify the variable, and will ignore
   * the `varName` property.
   */
  varId?: VarId

  /**
   * The low-level spec for the variable to be modified.  If defined, the implementation
   * will use this identify the variable.  If it is undefined, the implementation will
   * use the `varId` or `varName` to identify the variable, and may use this property
   * to cache the resulting `VarSpec` in this property for performance reasons.
   *
   * @hidden This is not yet part of the public API.
   */
  varSpec?: VarSpec
}

/** A data point. */
export interface Point {
  /** The x value (typically a time value). */
  x: number
  /** The y value. */
  y: number
}
