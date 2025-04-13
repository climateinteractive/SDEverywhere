// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { InputSettingGroupId } from '../../bundle/bundle-types'

//
// DATASETS
//

export type ComparisonDatasetName = string
export type ComparisonDatasetSource = string

/**
 * Specifies a dataset (variable) used for comparison.
 */
export interface ComparisonDatasetSpec {
  kind: 'dataset'
  /** The name of the dataset (variable). */
  name: ComparisonDatasetName
  /**
   * The source of the dataset, if it is from an external data file.  If
   * undefined, the dataset is assumed to be a model output.
   */
  source?: ComparisonDatasetSource
}

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
 * Specifies a single scenario that configures inputs differently for the two
 * model instances.
 */
export interface ComparisonScenarioWithDistinctInputsSpec {
  kind: 'scenario-with-distinct-inputs'
  /** The unique identifier for the scenario. */
  id?: ComparisonScenarioId
  /** The title of the scenario. */
  title?: ComparisonScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: ComparisonScenarioSubtitle
  /** The input settings for this scenario when run with the "left" model. */
  inputsL: ComparisonScenarioInputSpec[]
  /** The input settings for this scenario when run with the "right" model. */
  inputsR: ComparisonScenarioInputSpec[]
}

/**
 * Specifies a single scenario that configures inputs according to the setting
 * group defined for each model instance.
 */
export interface ComparisonScenarioWithSettingGroupSpec {
  kind: 'scenario-with-setting-group'
  /** The unique identifier for the scenario. */
  id?: ComparisonScenarioId
  /** The title of the scenario. */
  title?: ComparisonScenarioTitle
  /** The subtitle of the scenario. */
  subtitle?: ComparisonScenarioSubtitle
  /** The identifier of the input setting group as used in `ModelSpec.inputSettingGroups`. */
  settingGroupId: InputSettingGroupId
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
  | ComparisonScenarioWithDistinctInputsSpec
  | ComparisonScenarioWithSettingGroupSpec
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
// GRAPHS
//

export type ComparisonGraphId = string

/**
 * Specifies a list of graphs to be shown in a view.
 */
export interface ComparisonGraphsArraySpec {
  kind: 'graphs-array'
  /** The array of IDs for graphs to show. */
  graphIds: ComparisonGraphId[]
}

/**
 * Specifies a preset list of graphs to be shown in a view.
 */
export interface ComparisonGraphsPresetSpec {
  kind: 'graphs-preset'
  /** The preset (currently only "all" is supported, which shows all available graphs). */
  preset: 'all'
}

//
// GRAPH GROUPS
//

export type ComparisonGraphGroupId = string

/**
 * A definition of a group of graphs to be shown in a view.  Multiple graphs can be grouped together
 * under a single ID, and can later be referenced by group ID in a view definition.
 */
export interface ComparisonGraphGroupSpec {
  kind: 'graph-group'
  /** The unique identifier for the group. */
  id: ComparisonGraphGroupId
  /** The graphs that are included in this group. */
  graphIds: ComparisonGraphId[]
}

/** A reference to a graph group definition. */
export interface ComparisonGraphGroupRefSpec {
  kind: 'graph-group-ref'
  /** The ID of the graph group that is referenced. */
  groupId: ComparisonGraphGroupId
}

//
// VIEWS
//

export type ComparisonViewTitle = string
export type ComparisonViewSubtitle = string

export type ComparisonViewRowTitle = string
export type ComparisonViewRowSubtitle = string

export type ComparisonViewItemTitle = string
export type ComparisonViewItemSubtitle = string

export type ComparisonViewGraphOrder = 'default' | 'grouped-by-diffs'

/**
 * Specifies a single comparison box to be shown in a view.
 */
export interface ComparisonViewBoxSpec {
  kind: 'view-box'
  /** The title of the box. */
  title: ComparisonViewItemTitle
  /** The subtitle of the box. */
  subtitle?: ComparisonViewItemSubtitle
  /** The dataset shown in this comparison box. */
  dataset: ComparisonDatasetSpec
  /** The scenario shown in this comparison box. */
  scenarioId: ComparisonScenarioId
}

/**
 * Specifies a row of comparison boxes to be shown in a view.
 */
export interface ComparisonViewRowSpec {
  kind: 'view-row'
  /** The title of the row. */
  title: ComparisonViewRowTitle
  /** The subtitle of the row. */
  subtitle?: ComparisonViewRowSubtitle
  /** The array of boxes to be shown in the row. */
  boxes: ComparisonViewBoxSpec[]
}

/**
 * Specifies a set of graphs to be shown in a view.
 */
export type ComparisonViewGraphsSpec =
  | ComparisonGraphsPresetSpec
  | ComparisonGraphsArraySpec
  | ComparisonGraphGroupRefSpec

/**
 * A definition of a view.  A view presents a set of graphs, either for a single input scenario
 * or for a mix of different dataset/scenario combinations.
 */
export interface ComparisonViewSpec {
  kind: 'view'
  /** The title of the view.  If undefined, the title will be inferred from the scenario. */
  title?: ComparisonViewTitle
  /** The subtitle of the view.  If undefined, the subtitle will be inferred from the scenario. */
  subtitle?: ComparisonViewSubtitle
  /** The scenario to be shown in the view if this is a single-scenario view. */
  scenarioId?: ComparisonScenarioId
  /** The array of rows to be shown in the view if this is a freeform view. */
  rows?: ComparisonViewRowSpec[]
  /** The graphs to be shown in the view. */
  graphs?: ComparisonViewGraphsSpec
  /**
   * The order in which the graphs will be displayed.  If undefined, the graphs will be
   * displayed in the "default" order, i.e., in the same order that the IDs were specified.
   */
  graphOrder?: ComparisonViewGraphOrder
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
  /**
   * The order in which the graphs will be displayed.  If undefined, the graphs will be
   * displayed in the "default" order, i.e., in the same order that the IDs were specified.
   */
  graphOrder?: ComparisonViewGraphOrder
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
  scenarios?: ComparisonScenarioSpec[]
  /** The requested scenario groups. */
  scenarioGroups?: ComparisonScenarioGroupSpec[]
  /** The requested graph groups. */
  graphGroups?: ComparisonGraphGroupSpec[]
  /** The requested view groups. */
  viewGroups?: ComparisonViewGroupSpec[]
}

/** A source of comparison scenario and specifications. */
export interface ComparisonSpecsSource {
  kind: 'yaml' | 'json'
  /** The source filename, if known. */
  filename?: string
  /** A string containing YAML or JSON content. */
  content: string
}
