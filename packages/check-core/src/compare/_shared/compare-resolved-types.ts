// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { InputPosition, ScenarioSpec } from '../../_shared/scenario-spec-types'
import type { InputVar } from '../../bundle/var-types'
import type {
  CompareScenarioGroupId,
  CompareScenarioGroupTitle,
  CompareScenarioId,
  CompareViewGraphId,
  CompareViewGroupTitle,
  CompareViewSubtitle,
  CompareViewTitle
} from '../config/compare-spec-types'

//
// SCENARIOS
//

/** A unique key for a `CompareScenario`, generated internally for use by the library. */
export type CompareScenarioKey = string & { _brand?: 'CompareScenarioKey' }

export interface CompareResolverUnknownInputError {
  kind: 'unknown-input'
}

export interface CompareResolverInvalidValueError {
  kind: 'invalid-value'
}

export type CompareResolverError = CompareResolverUnknownInputError | CompareResolverInvalidValueError

/** Describes the resolution state for a scenario input relative to a specific model. */
export interface CompareScenarioInputState {
  /** The matched input variable; can be undefined if no input matched. */
  inputVar?: InputVar
  /** The position of the input, if this is a position scenario. */
  position?: InputPosition
  /** The value of the input, for the given position or explicit value. */
  value?: number
  /** The error info if the input could not be resolved. */
  error?: CompareResolverError
}

/** A scenario input that has been checked against both "left" and "right" model. */
export interface CompareScenarioInput {
  /** The requested name of the input. */
  requestedName: string
  /** The resolved state of the input for the "left" model. */
  stateL: CompareScenarioInputState
  /** The resolved state of the input for the "right" model. */
  stateR: CompareScenarioInputState
}

/** A configuration that sets model inputs to specific values. */
export interface CompareScenarioInputSettings {
  kind: 'input-settings'
  /** The resolutions for the specified inputs in the scenario. */
  inputs: CompareScenarioInput[]
}

/** A configuration that sets all inputs in the model to a certain position. */
export interface CompareScenarioAllInputsSettings {
  kind: 'all-inputs-settings'
  /** The input position that will be applied to all available inputs. */
  position: InputPosition
}

/**
 * The configuration for an input scenario, either a set of individual input settings, or one
 * that sets all inputs in the model to a certain position.
 */
export type CompareScenarioSettings = CompareScenarioInputSettings | CompareScenarioAllInputsSettings

/** A single resolved input scenario. */
export interface CompareScenario {
  kind: 'scenario'
  /** The unique key for the scenario, generated internally for use by the library. */
  key: CompareScenarioKey
  /** The unique user-defined identifier for the scenario. */
  id?: CompareScenarioId
  /** The scenario title. */
  title: string
  /** The scenario subtitle. */
  subtitle?: string
  /** The resolved settings for the model inputs in this scenario. */
  settings: CompareScenarioSettings
  /** The input scenario used to configure the "left" model, or undefined if data not available. */
  specL?: ScenarioSpec
  /** The input scenario used to configure the "right" model, or undefined if data not available. */
  specR?: ScenarioSpec
}

/** An unresolved input scenario reference. */
export interface CompareUnresolvedScenarioRef {
  kind: 'unresolved-scenario-ref'
  /** The ID of the referenced scenario that could not be resolved. */
  scenarioId: CompareScenarioId
}

//
// SCENARIO GROUPS
//

/** A resolved group of input scenarios. */
export interface CompareScenarioGroup {
  kind: 'scenario-group'
  /** The unique identifier for the group. */
  id?: CompareScenarioGroupId
  /** The title of the group. */
  title: CompareScenarioGroupTitle
  /**
   * The scenarios that are included in this group.  This includes scenario that were successfully
   * resolved as well as scenario references that could not be resolved.
   */
  scenarios: (CompareScenario | CompareUnresolvedScenarioRef)[]
}

/** An unresolved scenario group reference. */
export interface CompareUnresolvedScenarioGroupRef {
  kind: 'unresolved-scenario-group-ref'
  /** The ID of the referenced scenario group that could not be resolved. */
  scenarioGroupId: CompareScenarioGroupId
}

//
// VIEWS
//

/** A resolved view definition.  A view presents a set of graphs for a single input scenario. */
export interface CompareView {
  kind: 'view'
  /** The title of the view. */
  title: CompareViewTitle
  /** The subtitle of the view. */
  subtitle?: CompareViewSubtitle
  /** The resolved scenario to be shown in the view. */
  scenario: CompareScenario
  /** The graphs to be shown for each scenario view. */
  graphs: 'all' | CompareViewGraphId[]
}

/** An unresolved view. */
export interface CompareUnresolvedView {
  kind: 'unresolved-view'
  /** The requested title of the view, if provided. */
  title?: CompareViewTitle
  /** The requested subtitle of the view, if provided. */
  subtitle?: CompareViewSubtitle
  /** The ID of the referenced scenario that could not be resolved. */
  scenarioId?: CompareScenarioId
  /** The ID of the referenced scenario group that could not be resolved. */
  scenarioGroupId?: CompareScenarioGroupId
}

//
// VIEW GROUPS
//

/** A resolved group of compared scenario/graph views. */
export interface CompareViewGroup {
  kind: 'view-group'
  /** The title of the group of views. */
  title: CompareViewGroupTitle
  /** The array of resolved (and unresolved) views that are included in this group. */
  views: (CompareView | CompareUnresolvedView)[]
}
