// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { FormatString, OutputVarId, StringKey, UnitSystem } from './types'

/** A hex color code (e.g. '#ff0033'). */
export type HexColor = string

/** A line style specifier (e.g., 'line', 'dotted'). */
export type LineStyle = string

/** A line style modifier (e.g. 'straight', 'fill-to-next'). */
export type LineStyleModifier = string

/** A graph identifier string. */
export type GraphId = string

/** The side of a graph in the main interface. */
export type GraphSide = string

/** A graph kind (e.g., 'line', 'bar'). */
export type GraphKind = string

/** Describes one dataset to be plotted in a graph. */
export interface GraphDatasetSpec {
  /** The ID of the variable for this dataset, as used in SDEverywhere. */
  readonly varId: OutputVarId
  /**
   * The name of the variable for this dataset, as used in the modeling tool.
   * @hidden This is only included for internal testing use.
   */
  readonly varName?: string
  /** The source name (e.g. "Ref") if this is from an external data source. */
  readonly externalSourceName?: string
  /** The key for the dataset label string (as it appears in the graph legend). */
  readonly labelKey?: StringKey
  /** The color of the plot. */
  readonly color: HexColor
  /** The line style for the plot. */
  readonly lineStyle: LineStyle
  /** The line style modifiers for the plot. */
  readonly lineStyleModifiers?: ReadonlyArray<LineStyleModifier>
}

/** Describes one item in a graph legend. */
export interface GraphLegendItemSpec {
  /** The key for the legend item label string. */
  readonly labelKey: StringKey
  /** The color of the legend item. */
  readonly color: HexColor
}

/** Describes an alternate graph. */
export interface GraphAlternateSpec {
  /** The ID of the alternate graph. */
  readonly id: GraphId
  /** The unit system of the alternate graph. */
  readonly unitSystem: UnitSystem
}

/** Describes a graph that plots one or more model output variables. */
export interface GraphSpec {
  /** The graph ID. */
  readonly id: GraphId
  /** The graph kind. */
  readonly kind: GraphKind
  /** The key for the graph title string. */
  readonly titleKey: StringKey
  /** The key for the graph title as it appears in the miniature graph view (if undefined, use `titleKey`). */
  readonly miniTitleKey?: StringKey
  /** The key for the graph title as it appears in the menu (if undefined, use `titleKey`). */
  readonly menuTitleKey?: StringKey
  /** The key for the graph description string. */
  readonly descriptionKey?: StringKey
  /** Whether the graph is shown on the left or right side of the main interface. */
  readonly side?: GraphSide
  /** The unit system for this graph (if undefined, assume metric or international units). */
  readonly unitSystem?: UnitSystem
  /** Alternate versions of this graph (e.g. in a different unit system). */
  readonly alternates?: ReadonlyArray<GraphAlternateSpec>
  /** The minimum x-axis value. */
  readonly xMin?: number
  /** The maximum x-axis value. */
  readonly xMax?: number
  /** The key for the x-axis label string. */
  readonly xAxisLabelKey?: StringKey
  /** The minimum y-axis value. */
  readonly yMin?: number
  /** The maximum y-axis value. */
  readonly yMax?: number
  /**
   * The "soft" maximum y-axis value. If defined, the y-axis will not shrink smaller
   * than this value, but will grow as needed if any y values exceed this value.
   */
  readonly ySoftMax?: number
  /** The key for the y-axis label string. */
  readonly yAxisLabelKey?: StringKey
  /** The string used to format y-axis values. */
  readonly yFormat?: FormatString
  /** The datasets to plot in this graph. */
  readonly datasets: ReadonlyArray<GraphDatasetSpec>
  /** The items to display in the legend for this graph. */
  readonly legendItems: ReadonlyArray<GraphLegendItemSpec>
}
