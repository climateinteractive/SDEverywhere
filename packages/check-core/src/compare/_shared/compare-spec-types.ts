// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// SCENARIOS
//

export type CompareScenarioId = string

export type CompareScenarioTitle = string
export type CompareScenarioSubtitle = string

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
  /** The unique identifier for the scenario. */
  id?: CompareScenarioId
  /** The title of the scenario. */
  title?: CompareScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: CompareScenarioSubtitle
  /** The input settings for this scenario. */
  inputs: CompareScenarioInputSpec[]
}

/**
 * Specifies a single scenario that sets all available inputs to position.
 */
export interface CompareScenarioWithAllInputsSpec {
  kind: 'scenario-with-all-inputs'
  /** The unique identifier for the scenario. */
  id?: CompareScenarioId
  /** The title of the scenario. */
  title?: CompareScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: CompareScenarioSubtitle
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
  /** The ID of the scenario that is referenced. */
  scenarioId: CompareScenarioId
}

//
// SCENARIO GROUPS
//

export type CompareScenarioGroupId = string

export type CompareScenarioGroupTitle = string

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group ID in a view definition.
 */
export interface CompareScenarioGroupSpec {
  kind: 'scenario-group'
  /** The unique identifier for the group. */
  id?: CompareScenarioGroupId
  /** The title of the group. */
  title: CompareScenarioGroupTitle
  /** The scenarios that are included in this group. */
  scenarios: (CompareScenarioSpec | CompareScenarioRefSpec)[]
}

/** A reference to a scenario group definition. */
export interface CompareScenarioGroupRefSpec {
  kind: 'scenario-group-ref'
  /** The ID of the scenario group that is referenced. */
  groupId: CompareScenarioGroupId
}

//
// VIEWS
//

export type CompareViewTitle = string

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
 * A definition of a view.  A view presents a set of graphs for a single input scenario.
 */
export interface CompareViewSpec {
  kind: 'view'
  /** The title of the view.  If undefined, the title will be inferred from the scenario. */
  title?: CompareViewTitle
  /** The scenario to be shown in the view. */
  scenario: CompareScenarioRefSpec
  /** The graphs to be shown for each scenario view. */
  graphs: CompareViewGraphsSpec
}

//
// VIEW GROUPS
//

export type CompareViewGroupTitle = string

/**
 * Specifies a view group with an explicit array of view definitions.
 */
export interface CompareViewGroupWithViewsSpec {
  kind: 'view-group-with-views'
  /** The title of the group of views. */
  title: CompareViewGroupTitle
  /** The views that are included in this group. */
  views: CompareViewSpec[]
}

/**
 * Specifies a view group by declaring the scenarios included in the group (one view per scenario), along
 * with a set of graphs that will shown in each view.
 */
export interface CompareViewGroupWithScenariosSpec {
  kind: 'view-group-with-scenarios'
  /** The title of the group of views. */
  title: CompareViewGroupTitle
  /** The scenarios to be included (one view will be created for each scenario). */
  scenarios: (CompareScenarioRefSpec | CompareScenarioGroupRefSpec)[]
  /** The graphs to be shown for each scenario view. */
  graphs: CompareViewGraphsSpec
}

/**
 * A definition of a group of views.  Multiple related views can be grouped together under a single title
 * to make them easy to distinguish in a report.
 */
export type CompareViewGroupSpec = CompareViewGroupWithViewsSpec | CompareViewGroupWithScenariosSpec

//
// TOP-LEVEL TYPES
//

/**
 * Contains the scenario and view definitions from one or more sources (JSON/YAML files or manually
 * defined specs).
 */
export interface CompareSpecs {
  /** The requested scenarios. */
  scenarios: CompareScenarioSpec[]
  /** The requested scenario groups. */
  scenarioGroups: CompareScenarioGroupSpec[]
  /** The requested view groups. */
  viewGroups: CompareViewGroupSpec[]
}
