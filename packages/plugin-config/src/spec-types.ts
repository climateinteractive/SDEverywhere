// Copyright (c) 2022 Climate Interactive / New Venture Fund

//
// Common types
//

/** A key used to look up a translated string. */
export type StringKey = string

/** A string used to format a number value. */
export type FormatString = string

/** The available unit systems. */
export type UnitSystem = 'metric' | 'us'

/** An input variable identifier string, as used in SDEverywhere. */
export type InputVarId = string

/** An output variable identifier string, as used in SDEverywhere. */
export type OutputVarId = string

//
// Input-related types
//

/** An input (e.g., slider or switch) identifier. */
export type InputId = string

/** Describes a slider that controls an model input variable. */
export interface SliderSpec {
  readonly kind: 'slider'
  /** The input ID for this slider. */
  readonly id: InputId
  /** The ID of the associated input variable, as used in SDEverywhere. */
  readonly varId: InputVarId
  /**
   * The name of the associated input variable, as used in the modeling tool.
   * @hidden This is only included for internal testing use.
   */
  readonly varName?: string
  /** The default value of the variable controlled by the slider. */
  readonly defaultValue: number
  /** The minimum value of the variable controlled by the slider. */
  readonly minValue: number
  /** The maximum value of the variable controlled by the slider. */
  readonly maxValue: number
  /** The size of each step/increment between stops. */
  readonly step: number
  /** Whether to display the slider with the endpoints reversed. */
  readonly reversed: boolean
  /** The key for the slider label string. */
  readonly labelKey: StringKey
  /** The key for the label string when this slider appears in "Actions & Outcomes". */
  readonly listingLabelKey?: StringKey
  /** The key for the slider description string. */
  readonly descriptionKey?: StringKey
  /** The key for the units string. */
  readonly unitsKey?: StringKey
  /** The keys for the slider range label strings. */
  readonly rangeLabelKeys: ReadonlyArray<StringKey>
  /** The values that mark the ranges within the slider. */
  readonly rangeDividers: ReadonlyArray<number>
  /** The string used to format the slider value. */
  readonly format?: FormatString
}

/** Describes an on/off switch that controls an input variable. */
export interface SwitchSpec {
  readonly kind: 'switch'
  /** The input ID for this switch. */
  readonly id: InputId
  /** The ID of the associated input variable, as used in SDEverywhere. */
  readonly varId: InputVarId
  /**
   * The name of the associated input variable, as used in the modeling tool.
   * @hidden This is only included for internal testing use.
   */
  readonly varName?: string
  /** The default value of the variable controlled by the switch. */
  readonly defaultValue: number
  /** The value of the variable when this switch is in an "off" state. */
  readonly offValue: number
  /** The value of the variable when this switch is in an "on" state. */
  readonly onValue: number
  /** The key for the switch label string. */
  readonly labelKey: StringKey
  /** The key for the label string when this switch appears in "Actions & Outcomes". */
  readonly listingLabelKey?: StringKey
  /** The key for the switch description string. */
  readonly descriptionKey?: StringKey
  /** The set of sliders that will be active/enabled when this switch is "off". */
  readonly slidersActiveWhenOff: ReadonlyArray<InputId>
  /** The set of sliders that will be active/enabled when this switch is "on". */
  readonly slidersActiveWhenOn: ReadonlyArray<InputId>
}

/** An input is either a slider or a switch (with associated sliders). */
export type InputSpec = SliderSpec | SwitchSpec

//
// Graph-related types
//

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
