// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// SCENARIOS
//

export type ComparisonScenarioId = string

export type ComparisonScenarioTitle = string
export type ComparisonScenarioSubtitle = string

export type ComparisonScenarioInputName = string

export type ComparisonScenarioInputPosition = 'default' | 'min' | 'max'

/**
 * Specifies an input that is set to a specific position (default / min / max).
 */
export interface ComparisonScenarioInputAtPositionSpec {
  kind: 'input-at-position'
  /** The requested input name or alias. */
  inputName: ComparisonScenarioInputName
  /** The requested position of the input. */
  position: ComparisonScenarioInputPosition
}

/**
 * Specifies an input that is set to a specific number value.
 */
export interface ComparisonScenarioInputAtValueSpec {
  kind: 'input-at-value'
  /** The requested input name or alias. */
  inputName: ComparisonScenarioInputName
  /** The number value of the input. */
  value: number
}

/**
 * A single input setting for a scenario.  An input can be set to a specific number value,
 * or it can be set to a "position" (default / min / max).
 */
export type ComparisonScenarioInputSpec = ComparisonScenarioInputAtPositionSpec | ComparisonScenarioInputAtValueSpec

/**
 * Specifies a single scenario that sets one or more inputs to a value/position.
 */
export interface ComparisonScenarioWithInputsSpec {
  kind: 'scenario-with-inputs'
  /** The unique identifier for the scenario. */
  id?: ComparisonScenarioId
  /** The title of the scenario. */
  title?: ComparisonScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: ComparisonScenarioSubtitle
  /** The input settings for this scenario. */
  inputs: ComparisonScenarioInputSpec[]
}

/**
 * Specifies a single scenario that sets all available inputs to position.
 */
export interface ComparisonScenarioWithAllInputsSpec {
  kind: 'scenario-with-all-inputs'
  /** The unique identifier for the scenario. */
  id?: ComparisonScenarioId
  /** The title of the scenario. */
  title?: ComparisonScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: ComparisonScenarioSubtitle
  /** The position that will be used for all available inputs. */
  position: ComparisonScenarioInputPosition
}

/**
 * Special preset that expands to many scenarios:
 * - one scenario with all inputs at their default
 * - two scenarios for each available input:
 *     - one scenario with the input at its minimum
 *     - one scenario with the input at its maximum
 */
export interface ComparisonScenarioPresetMatrixSpec {
  kind: 'scenario-matrix'
}

/**
 * A definition of input scenario(s).  A scenario can set one input to a value/position, or it
 * can set multiple inputs to particular values/positions.
 */
export type ComparisonScenarioSpec =
  | ComparisonScenarioWithInputsSpec
  | ComparisonScenarioWithAllInputsSpec
  | ComparisonScenarioPresetMatrixSpec

/** A reference to a scenario definition. */
export interface ComparisonScenarioRefSpec {
  kind: 'scenario-ref'
  /** The ID of the scenario that is referenced. */
  scenarioId: ComparisonScenarioId
  /** The optional title that is used instead of the referenced scenario's title. */
  title?: ComparisonScenarioTitle
  /** The optional subtitle that is used instead of the referenced scenario's subtitle. */
  subtitle?: ComparisonScenarioSubtitle
}

//
// SCENARIO GROUPS
//

export type ComparisonScenarioGroupId = string

export type ComparisonScenarioGroupTitle = string

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group ID in a view definition.
 */
export interface ComparisonScenarioGroupSpec {
  kind: 'scenario-group'
  /** The unique identifier for the group. */
  id?: ComparisonScenarioGroupId
  /** The title of the group. */
  title: ComparisonScenarioGroupTitle
  /** The scenarios that are included in this group. */
  scenarios: (ComparisonScenarioSpec | ComparisonScenarioRefSpec)[]
}

/** A reference to a scenario group definition. */
export interface ComparisonScenarioGroupRefSpec {
  kind: 'scenario-group-ref'
  /** The ID of the scenario group that is referenced. */
  groupId: ComparisonScenarioGroupId
}

//
// VIEWS
//

export type ComparisonViewTitle = string
export type ComparisonViewSubtitle = string

export type ComparisonViewGraphId = string

/**
 * Specifies a list of graphs to be shown in a view.
 */
export interface ComparisonViewGraphsArraySpec {
  kind: 'graphs-array'
  /** The array of IDs for graphs to show. */
  graphIds: ComparisonViewGraphId[]
}

/**
 * Specifies a preset list of graphs to be shown in a view.
 */
export interface ComparisonViewGraphsPresetSpec {
  kind: 'graphs-preset'
  /** The preset (currently only "all" is supported, which shows all available graphs). */
  preset: 'all'
}

/**
 * Specifies a set of graphs to be shown in a view.
 */
export type ComparisonViewGraphsSpec = ComparisonViewGraphsArraySpec | ComparisonViewGraphsPresetSpec

/**
 * A definition of a view.  A view presents a set of graphs for a single input scenario.
 */
export interface ComparisonViewSpec {
  kind: 'view'
  /** The title of the view.  If undefined, the title will be inferred from the scenario. */
  title?: ComparisonViewTitle
  /** The subtitle of the view.  If undefined, the subtitle will be inferred from the scenario. */
  subtitle?: ComparisonViewGroupTitle
  /** The scenario to be shown in the view. */
  scenarioId: ComparisonScenarioId
  /** The graphs to be shown for each scenario view. */
  graphs: ComparisonViewGraphsSpec
}

//
// VIEW GROUPS
//

export type ComparisonViewGroupTitle = string

/**
 * Specifies a view group with an explicit array of view definitions.
 */
export interface ComparisonViewGroupWithViewsSpec {
  kind: 'view-group-with-views'
  /** The title of the group of views. */
  title: ComparisonViewGroupTitle
  /** The views that are included in this group. */
  views: ComparisonViewSpec[]
}

/**
 * Specifies a view group by declaring the scenarios included in the group (one view per scenario), along
 * with a set of graphs that will shown in each view.
 */
export interface ComparisonViewGroupWithScenariosSpec {
  kind: 'view-group-with-scenarios'
  /** The title of the group of views. */
  title: ComparisonViewGroupTitle
  /** The scenarios to be included (one view will be created for each scenario). */
  scenarios: (ComparisonScenarioRefSpec | ComparisonScenarioGroupRefSpec)[]
  /** The graphs to be shown for each scenario view. */
  graphs: ComparisonViewGraphsSpec
}

/**
 * A definition of a group of views.  Multiple related views can be grouped together under a single title
 * to make them easy to distinguish in a report.
 */
export type ComparisonViewGroupSpec = ComparisonViewGroupWithViewsSpec | ComparisonViewGroupWithScenariosSpec

//
// TOP-LEVEL TYPES
//

/**
 * Contains the scenario and view definitions from one or more sources (JSON/YAML files or manually
 * defined specs).
 */
export interface ComparisonSpecs {
  /** The requested scenarios. */
  scenarios: ComparisonScenarioSpec[]
  /** The requested scenario groups. */
  scenarioGroups: ComparisonScenarioGroupSpec[]
  /** The requested view groups. */
  viewGroups: ComparisonViewGroupSpec[]
}

/** A source of comparison scenario and specifications. */
export interface ComparisonSpecsSource {
  kind: 'yaml' | 'json'
  /** The source filename, if known. */
  filename?: string
  /** A string containing YAML or JSON content. */
  content: string
}
