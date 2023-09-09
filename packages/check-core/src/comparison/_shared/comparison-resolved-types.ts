// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { InputPosition, ScenarioSpec } from '../../_shared/scenario-spec-types'
import type { InputVar, OutputVar } from '../../bundle/var-types'
import type {
  ComparisonScenarioGroupId,
  ComparisonScenarioGroupTitle,
  ComparisonScenarioId,
  ComparisonViewGraphId,
  ComparisonViewGroupTitle,
  ComparisonViewSubtitle,
  ComparisonViewTitle
} from '../config/comparison-spec-types'

//
// DATASETS
//

/** A resolved dataset that is being compared. */
export interface ComparisonDataset {
  kind: 'dataset'
  /** The unique key for the dataset (i.e., output variable or static data). */
  key: DatasetKey
  /**
   * The resolved output variable from the "left" model that corresponds to this dataset,
   * or undefined if the variable is not defined in the left model.
   */
  outputVarL?: OutputVar
  /**
   * The resolved output variable from the "right" model that corresponds to this dataset,
   * or undefined if the variable is not defined in the right model.
   */
  outputVarR?: OutputVar
}

//
// SCENARIOS
//

/** A unique key for a `ComparisonScenario`, generated internally for use by the library. */
export type ComparisonScenarioKey = string & { _brand?: 'ComparisonScenarioKey' }

export interface ComparisonResolverUnknownInputError {
  kind: 'unknown-input'
}

export interface ComparisonResolverInvalidValueError {
  kind: 'invalid-value'
}

export type ComparisonResolverError = ComparisonResolverUnknownInputError | ComparisonResolverInvalidValueError

/** Describes the resolution state for a scenario input relative to a specific model. */
export interface ComparisonScenarioInputState {
  /** The matched input variable; can be undefined if no input matched. */
  inputVar?: InputVar
  /** The position of the input, if this is a position scenario. */
  position?: InputPosition
  /** The value of the input, for the given position or explicit value. */
  value?: number
  /** The error info if the input could not be resolved. */
  error?: ComparisonResolverError
}

/** A scenario input that has been checked against both "left" and "right" model. */
export interface ComparisonScenarioInput {
  /** The requested name of the input. */
  requestedName: string
  /** The resolved state of the input for the "left" model. */
  stateL: ComparisonScenarioInputState
  /** The resolved state of the input for the "right" model. */
  stateR: ComparisonScenarioInputState
}

/** A configuration that sets model inputs to specific values. */
export interface ComparisonScenarioInputSettings {
  kind: 'input-settings'
  /** The resolutions for the specified inputs in the scenario. */
  inputs: ComparisonScenarioInput[]
}

/** A configuration that sets all inputs in the model to a certain position. */
export interface ComparisonScenarioAllInputsSettings {
  kind: 'all-inputs-settings'
  /** The input position that will be applied to all available inputs. */
  position: InputPosition
}

/**
 * The configuration for an input scenario, either a set of individual input settings, or one
 * that sets all inputs in the model to a certain position.
 */
export type ComparisonScenarioSettings = ComparisonScenarioInputSettings | ComparisonScenarioAllInputsSettings

/** A single resolved input scenario. */
export interface ComparisonScenario {
  kind: 'scenario'
  /** The unique key for the scenario, generated internally for use by the library. */
  key: ComparisonScenarioKey
  /** The unique user-defined identifier for the scenario. */
  id?: ComparisonScenarioId
  /** The scenario title. */
  title: string
  /** The scenario subtitle. */
  subtitle?: string
  /** The resolved settings for the model inputs in this scenario. */
  settings: ComparisonScenarioSettings
  /** The input scenario used to configure the "left" model, or undefined if data not available. */
  specL?: ScenarioSpec
  /** The input scenario used to configure the "right" model, or undefined if data not available. */
  specR?: ScenarioSpec
}

/** An unresolved input scenario reference. */
export interface ComparisonUnresolvedScenarioRef {
  kind: 'unresolved-scenario-ref'
  /** The ID of the referenced scenario that could not be resolved. */
  scenarioId: ComparisonScenarioId
}

//
// SCENARIO GROUPS
//

/** A resolved group of input scenarios. */
export interface ComparisonScenarioGroup {
  kind: 'scenario-group'
  /** The unique identifier for the group. */
  id?: ComparisonScenarioGroupId
  /** The title of the group. */
  title: ComparisonScenarioGroupTitle
  /**
   * The scenarios that are included in this group.  This includes scenario that were successfully
   * resolved as well as scenario references that could not be resolved.
   */
  scenarios: (ComparisonScenario | ComparisonUnresolvedScenarioRef)[]
}

/** An unresolved scenario group reference. */
export interface ComparisonUnresolvedScenarioGroupRef {
  kind: 'unresolved-scenario-group-ref'
  /** The ID of the referenced scenario group that could not be resolved. */
  scenarioGroupId: ComparisonScenarioGroupId
}

//
// VIEWS
//

/** A resolved view definition.  A view presents a set of graphs for a single input scenario. */
export interface ComparisonView {
  kind: 'view'
  /** The title of the view. */
  title: ComparisonViewTitle
  /** The subtitle of the view. */
  subtitle?: ComparisonViewSubtitle
  /** The resolved scenario to be shown in the view. */
  scenario: ComparisonScenario
  /** The graphs to be shown for each scenario view. */
  graphs: 'all' | ComparisonViewGraphId[]
}

/** An unresolved view. */
export interface ComparisonUnresolvedView {
  kind: 'unresolved-view'
  /** The requested title of the view, if provided. */
  title?: ComparisonViewTitle
  /** The requested subtitle of the view, if provided. */
  subtitle?: ComparisonViewSubtitle
  /** The ID of the referenced scenario that could not be resolved. */
  scenarioId?: ComparisonScenarioId
  /** The ID of the referenced scenario group that could not be resolved. */
  scenarioGroupId?: ComparisonScenarioGroupId
}

//
// VIEW GROUPS
//

/** A resolved group of compared scenario/graph views. */
export interface ComparisonViewGroup {
  kind: 'view-group'
  /** The title of the group of views. */
  title: ComparisonViewGroupTitle
  /** The array of resolved (and unresolved) views that are included in this group. */
  views: (ComparisonView | ComparisonUnresolvedView)[]
}
