// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, SourceName, VarId } from '../_shared/types'

/**
 * Holds information about an item related to a variable used in the model.
 * For example, this can be used to attach information about a graph that
 * an output variable is used in, or a slider that controls an input variable.
 */
export interface RelatedItem {
  id: string
  locationPath: string[]
}

/** A unique, stable input identifier. */
export type InputId = string

/**
 * Holds information about an input variable that is controlled by a continuous range/slider.
 */
export interface SliderInputVar {
  /** Indicates that this input is controlled by a continuous range/slider. */
  kind: 'slider'
  /**
   * A unique, stable identifier string for this input.
   *
   * This can be used to identify an input variable in a way that is resilient
   * to the variable's name being changed between two versions of the model.
   *
   * For example, if both the "left" and "right" versions of the model have an
   * input with an `inputId` of 2, but the variable is called "Variable 2" in
   * the left and "Variable Two" in the right, the inputs can be correlated and
   * compared despite the different variable names.
   */
  inputId: InputId
  /** The variable identifier (typically a simplified/canonical ID, like the form used in SDE). */
  varId: VarId
  /** The full variable name as used in the modeling tool. */
  varName: string
  /** The default value of the input. */
  defaultValue: number
  /** The minimum value of the input. */
  minValue: number
  /** The maximum value of the input. */
  maxValue: number
  /** The size of each step/increment between stops. */
  step?: number
  /** Whether to display the slider with the endpoints reversed. */
  reversed?: boolean
  /** The units string. */
  units?: string
  /** The string used to format the slider value. */
  format?: string
  /** The metadata for the related input control. */
  relatedItem?: RelatedItem
}

/**
 * Holds information about an input variable that is controlled by a discrete on/off switch.
 */
export interface SwitchInputVar {
  /** Indicates that this input is controlled by a discrete on/off switch. */
  kind: 'switch'
  /**
   * A unique, stable identifier string for this input.
   *
   * This can be used to identify an input variable in a way that is resilient
   * to the variable's name being changed between two versions of the model.
   */
  inputId: InputId
  /** The variable identifier (typically a simplified/canonical ID, like the form used in SDE). */
  varId: VarId
  /** The full variable name as used in the modeling tool. */
  varName: string
  /** The default value of the input. */
  defaultValue: number
  /** The value of the variable when this switch is in an "off" state. */
  offValue: number
  /** The value of the variable when this switch is in an "on" state. */
  onValue: number
  /** The set of input IDs for sliders that will be active/enabled when this switch is "off". */
  slidersActiveWhenOff?: InputId[]
  /** The set of input IDs for sliders that will be active/enabled when this switch is "on". */
  slidersActiveWhenOn?: InputId[]
  /** The metadata for the related input control. */
  relatedItem?: RelatedItem
}

/**
 * Holds information about an input variable used in the model.  This is a discriminated
 * union; use the `kind` field to determine the underlying variant.
 */
export type InputVar = SliderInputVar | SwitchInputVar

/**
 * Holds information about an output variable used in the model.
 */
export interface OutputVar {
  /** The unique dataset key for this variable (it should include `sourceName` and `varId`). */
  datasetKey: DatasetKey
  /**
   * The source for the variable (e.g., undefined for a normal model output, "Data" for a variable
   * that is defined in an external data file).
   */
  sourceName?: SourceName
  /** The variable identifier (typically a simplified/canonical ID, like the form used in SDE). */
  varId: VarId
  /** The full variable name as used in the modeling tool. */
  varName: string
  /** The metadata for the related visuals/graphs in which this variable is used. */
  relatedItems?: RelatedItem[]
}

/**
 * Holds information about a variable used in the model implementation.
 */
export interface ImplVar {
  /** The variable identifier, as used in SDE. */
  varId: VarId
  /** The variable name, as used in the modeling tool. */
  varName: string
  /** The variable type (e.g. 'level', 'const'). */
  varType: string
  /** The variable index, used to reference the value in the generated model. */
  varIndex: number
  /** The subscript index values, used to reference the value in the generated model. */
  subscriptIndices?: number[]
}
