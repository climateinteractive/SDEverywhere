// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// SCENARIOS
//

export type CompareScenarioName = string

export type CompareScenarioInputName = string

export type CompareScenarioInputPosition = 'default' | 'min' | 'max'

/**
 * A single input setting for a scenario.  An input can be set to a specific number value,
 * or it can be set to a "position" (default / min / max), which depends on how a particular
 * model input is configured.
 */
export interface CompareScenarioInputSpec {
  input: CompareScenarioInputName
  at: CompareScenarioInputPosition | number
}

/**
 * A definition of an input scenario.  A scenario can set one input to a value/position, or it
 * can set multiple inputs to particular values/positions.
 */
export interface CompareScenarioSpec {
  name?: CompareScenarioName
  preset?: 'matrix'
  with?: CompareScenarioInputName | CompareScenarioInputSpec[]
  with_inputs?: 'all'
  // with_inputs_in?: string
  at?: CompareScenarioInputPosition | number
}

/** A single item in an array of scenario definitions. */
export interface CompareScenarioArrayItemSpec {
  scenario: CompareScenarioSpec
}

/** A reference to a scenario definition. */
export interface CompareScenarioRefSpec {
  scenario_ref: CompareScenarioName
}

//
// SCENARIO GROUPS
//

export type CompareScenarioGroupName = string

export type CompareScenarioGroupScenariosItemSpec = CompareScenarioArrayItemSpec | CompareScenarioRefSpec

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group name in a view definition.
 */
export interface CompareScenarioGroupSpec {
  name: CompareScenarioGroupName
  scenarios: CompareScenarioGroupScenariosItemSpec[]
}

/** A single item in an array of scenario group definitions. */
export interface CompareScenarioGroupArrayItemSpec {
  scenario_group: CompareScenarioGroupSpec
}

/** A reference to a scenario group definition. */
export interface CompareScenarioGroupRefSpec {
  scenario_group_ref: CompareScenarioGroupName
}

//
// VIEWS
//

export type CompareViewName = string

// TODO: Allow for defining scenarios inline
export type CompareViewScenariosItemSpec = CompareScenarioRefSpec | CompareScenarioGroupRefSpec

export type CompareViewGraphsPreset = 'all'

export type CompareViewGraphIdSpec = string

/**
 * A definition of a view.  A view presents a set of graphs for a single input scenario.  This
 * definition allows for specifying a set of graphs to be shown in a number of different scenarios.
 */
export interface CompareViewSpec {
  name: CompareViewName
  // desc?: string
  scenarios?: CompareViewScenariosItemSpec[]
  graphs?: CompareViewGraphsPreset | CompareViewGraphIdSpec[]
}

/** A single item in an array of view definitions. */
export interface CompareViewArrayItemSpec {
  view: CompareViewSpec
}

//
// VIEW GROUPS
//

export type CompareViewGroupName = string

/**
 * A definition of a group of views.  Multiple related views can be grouped together under a single name
 * to make them easy to distinguish in a report.
 */
export interface CompareViewGroupViewsItemSpec {
  view: CompareViewSpec
}

/** A definition of a view group. */
export interface CompareViewGroupSpec {
  name: CompareViewGroupName
  views: CompareViewGroupViewsItemSpec[]
}

/** A single item in an array of view definitions. */
export interface CompareViewGroupArrayItemSpec {
  view_group: CompareViewGroupSpec
}

//
// TOP-LEVEL DEFS
//

export type CompareTopLevelDefItem =
  | CompareScenarioArrayItemSpec
  | CompareScenarioGroupArrayItemSpec
  | CompareViewGroupArrayItemSpec

/**
 * Rolls up all the scenario and view definitions from one or more YAML files into a single entity.
 */
export interface CompareSpec {
  scenarios: CompareScenarioSpec[]
  scenarioGroups: CompareScenarioGroupSpec[]
  viewGroups: CompareViewGroupSpec[]
}
