// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { InputVar } from '../../bundle/var-types'
import type { InputPosition } from '../../_shared/scenario'

//
// SCENARIOS
//

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

/** A single resolved input scenario with all inputs set to a given position. */
export interface CompareScenarioWithAllInputs {
  kind: 'scenario-with-all-inputs'
  /** The scenario title. */
  title: string
  /** The scenario subtitle. */
  subtitle?: string
  /** The input position that will be applied to all available inputs. */
  position: InputPosition
}

/** A single resolved input scenario with a set of inputs. */
export interface CompareScenarioWithInputs {
  kind: 'scenario-with-inputs'
  /** The scenario title. */
  title: string
  /** The scenario subtitle. */
  subtitle?: string
  /** The resolutions for all inputs in the scenario. */
  resolvedInputs: CompareScenarioInput[]
}

/** A single resolved input scenario. */
export type CompareScenario = CompareScenarioWithAllInputs | CompareScenarioWithInputs
