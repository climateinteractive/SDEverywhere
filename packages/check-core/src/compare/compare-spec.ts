// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// SCENARIOS
//

export type CompareScenarioName = string

export type CompareScenarioInputName = string

export type CompareScenarioInputPosition = 'default' | 'min' | 'max'

/**
 * Specifies an input that is set to a specific position (default / min / max).
 */
export interface CompareScenarioInputAtPositionSpec {
  kind: 'input-at-position'
  /** The requested input name or alias. */
  inputName: CompareScenarioInputName
  /** The requested position of the input. */
  position: CompareScenarioInputPosition
}

/**
 * Specifies an input that is set to a specific number value.
 */
export interface CompareScenarioInputAtValueSpec {
  kind: 'input-at-value'
  /** The requested input name or alias. */
  inputName: CompareScenarioInputName
  /** The number value of the input. */
  value: number
}

/**
 * A single input setting for a scenario.  An input can be set to a specific number value,
 * or it can be set to a "position" (default / min / max).
 */
export type CompareScenarioInputSpec = CompareScenarioInputAtPositionSpec | CompareScenarioInputAtValueSpec

/**
 * Specifies a single scenario that sets one or more inputs to a value/position.
 */
export interface CompareScenarioWithInputsSpec {
  kind: 'scenario-with-inputs'
  /** The title of the scenario. */
  title?: string
  /** The subtitle of the scenario. */
  subtitle?: string
  /** The input settings for this scenario. */
  inputs: CompareScenarioInputSpec[]
}

/**
 * Specifies a single scenario that sets all available inputs to position.
 */
export interface CompareScenarioWithAllInputsSpec {
  kind: 'scenario-with-all-inputs'
  /** The title of the scenario. */
  title?: string
  /** The subtitle of the scenario. */
  subtitle?: string
  /** The position that will be used for all available inputs. */
  position: CompareScenarioInputPosition
}

/**
 * Special preset that expands to many scenarios:
 * - one scenario with all inputs at their default
 * - two scenarios for each available input:
 *     - one scenario with the input at its minimum
 *     - one scenario with the input at its maximum
 */
export interface CompareScenarioPresetMatrixSpec {
  kind: 'scenario-matrix'
}

/**
 * A definition of input scenario(s).  A scenario can set one input to a value/position, or it
 * can set multiple inputs to particular values/positions.
 */
export type CompareScenarioSpec =
  | CompareScenarioWithInputsSpec
  | CompareScenarioWithAllInputsSpec
  | CompareScenarioPresetMatrixSpec

/** A reference to a scenario definition. */
export interface CompareScenarioRefSpec {
  kind: 'scenario-ref'
  /** The name of the scenario that is referenced. */
  scenarioName: CompareScenarioName
}

//
// SCENARIO GROUPS
//

export type CompareScenarioGroupName = string

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group name in a view definition.
 */
export interface CompareScenarioGroupSpec {
  kind: 'scenario-group'
  /** The name of the group. */
  name: CompareScenarioGroupName
  /** The scenarios that are included in this group. */
  scenarios: (CompareScenarioSpec | CompareScenarioRefSpec)[]
}

/** A reference to a scenario group definition. */
export interface CompareScenarioGroupRefSpec {
  kind: 'scenario-group-ref'
  /** The name of the scenario group that is referenced. */
  groupName: CompareScenarioGroupName
}

//
// VIEWS
//

export type CompareViewName = string

export type CompareViewGraphId = string

/**
 * Specifies a list of graphs to be shown in a view.
 */
export interface CompareViewGraphsArraySpec {
  kind: 'graphs-array'
  /** The array of IDs for graphs to show. */
  graphIds: CompareViewGraphId[]
}

/**
 * Specifies a preset list of graphs to be shown in a view.
 */
export interface CompareViewGraphsPresetSpec {
  kind: 'graphs-preset'
  /** The preset (currently only "all" is supported, which shows all available graphs). */
  preset: 'all'
}

/**
 * Specifies a set of graphs to be shown in a view.
 */
export type CompareViewGraphsSpec = CompareViewGraphsArraySpec | CompareViewGraphsPresetSpec

/**
 * A definition of a view.  A view presents a set of graphs for a single input scenario.  This
 * definition allows for specifying a set of graphs to be shown in a number of different scenarios.
 */
export interface CompareViewSpec {
  kind: 'view'
  /** The name of the view. */
  name: CompareViewName
  /** The set of scenarios to be shown in the views. */
  scenarios: (CompareScenarioRefSpec | CompareScenarioGroupRefSpec)[]
  /** The graphs to be shown for each scenario view. */
  graphs: CompareViewGraphsSpec
}

//
// VIEW GROUPS
//

export type CompareViewGroupName = string

/**
 * A definition of a group of views.  Multiple related views can be grouped together under a single name
 * to make them easy to distinguish in a report.
 */
export interface CompareViewGroupSpec {
  kind: 'view-group'
  /** The name of the group of views. */
  name: CompareViewGroupName
  /** The views that are included in this group. */
  views: CompareViewSpec[]
}

//
// TOP-LEVEL TYPES
//

/**
 * Contains the scenario and view definitions from one or more sources (JSON/YAML files or manually
 * defined specs).
 */
export interface CompareSpec {
  /** The requested scenarios. */
  scenarios: CompareScenarioSpec[]
  /** The requested scenario groups. */
  scenarioGroups: CompareScenarioGroupSpec[]
  /** The requested view groups. */
  viewGroups: CompareViewGroupSpec[]
}
