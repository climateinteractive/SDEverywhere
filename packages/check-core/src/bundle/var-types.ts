// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { SourceName, VarId } from '../_shared/types'

/**
 * Holds information about an item related to a variable used in the model.
 * For example, this can be used to attach information about a graph that
 * an output variable is used in, or a slider that controls an input variable.
 */
export interface RelatedItem {
  id: string
  locationPath: string[]
}

/**
 * Holds information about an input variable used in the model.
 */
export interface InputVar {
  varId: VarId
  varName: string
  defaultValue: number
  minValue: number
  maxValue: number
  relatedItem?: RelatedItem
}

/**
 * Holds information about an output variable used in the model.
 */
export interface OutputVar {
  sourceName?: SourceName
  varId: VarId
  varName: string
  relatedItems?: RelatedItem[]
}

/**
 * Holds information about a subscript used in the model.
 */
export interface Subscript {
  /** The subscript identifier, as used in SDE. */
  id: string
  /** The subscript name, as used in Vensim. */
  name: string
}

/**
 * Holds information about a dimension (subscript family) used in the model.
 */
export interface Dimension {
  /** The dimension identifier, as used in SDE. */
  id: string
  /** The dimension name, as used in Vensim. */
  name: string
  /** The set of subscripts in this dimension. */
  subscripts: Subscript[]
}

/**
 * Holds information about a variable used in the model implementation.
 */
export interface ImplVar {
  /** The variable identifier, as used in SDE. */
  varId: VarId
  /** The variable name, as used in Vensim. */
  varName: string
  /** The variable index, used by SDE to reference the value in the generated model. */
  varIndex: number
  /** The set of dimensions for this variable. */
  dimensions: Dimension[]
  /** The variable type (e.g. 'level', 'const'). */
  varType: string
}
