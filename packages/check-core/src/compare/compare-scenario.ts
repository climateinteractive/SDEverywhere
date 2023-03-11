// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition } from '../_shared/scenario'
import type { CompareScenarioInputPosition, CompareScenarioInputSpec, CompareScenarioSpec } from './compare-spec'
import type { InputId, InputVar } from '../bundle/var-types'
import type { ModelInputs } from './model-inputs'

export interface CompareScenarioUnknownInputError {
  kind: 'unknown-input'
}

export interface CompareScenarioInvalidValueError {
  kind: 'invalid-value'
}

export type CompareScenarioError = CompareScenarioUnknownInputError | CompareScenarioInvalidValueError

/** Describes the resolution state for a scenario input relative to a specific model. */
export interface CompareScenarioInputState {
  /** The matched input variable; can be undefined if no input matched. */
  inputVar?: InputVar
  /** The position of the input, if this is a position scenario. */
  position?: InputPosition
  /** The value of the input, for the given position or explicit value. */
  value?: number
  /** The error info if the input could not be resolved. */
  error?: CompareScenarioError
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

/**
 * Return the list of scenarios that can be expanded from the given specs.
 *
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param scenarioSpecs The scenario specs from a comparison definition.
 * @param simplify If true, reduce the number of scenarios generated for a `matrix`
 * to make the tests run faster, otherwise expand the full set of scenarios.
 */
export function expandScenarios(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  scenarioSpecs: CompareScenarioSpec[],
  simplify: boolean
): CompareScenario[] {
  // Resolve the specs and convert to `CompareScenario` instances
  const resolvedScenarios: CompareScenario[] = []
  for (const scenarioSpec of scenarioSpecs) {
    resolvedScenarios.push(...resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioSpec, simplify))
  }
  return resolvedScenarios
}

/**
 * Return one or more resolved `CompareScenario` instances for the given scenario spec.
 */
function resolveScenariosFromSpec(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  scenarioSpec: CompareScenarioSpec,
  simplify: boolean
): CompareScenario[] {
  switch (scenarioSpec.kind) {
    case 'scenario-matrix':
      // Create a matrix of scenarios
      return resolveScenarioMatrix(modelInputsL, modelInputsR, simplify)

    case 'scenario-with-all-inputs': {
      // Create an "all inputs at <position>" scenario
      const position = inputPosition(scenarioSpec.position)
      return [resolveScenarioWithAllInputsAtPosition(scenarioSpec.title, scenarioSpec.subtitle, position)]
    }

    case 'scenario-with-inputs': {
      // Create one scenario that contains the given input setting(s)
      return [
        resolveScenarioForInputSpecs(
          modelInputsL,
          modelInputsR,
          scenarioSpec.title,
          scenarioSpec.subtitle,
          scenarioSpec.inputs
        )
      ]
    }

    default:
      assertNever(scenarioSpec)
  }
}

/**
 * Return a matrix of scenarios that covers all inputs for the given model.
 */
function resolveScenarioMatrix(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  simplify: boolean
): CompareScenario[] {
  const resolvedScenarios: CompareScenario[] = []

  // Add an "all inputs at default" scenario
  resolvedScenarios.push(resolveScenarioWithAllInputsAtPosition(undefined, undefined, 'at-default'))

  if (!simplify) {
    // Get the union of all input IDs appearing on either side
    const inputIdAliases: Set<InputId> = new Set()
    modelInputsL.getAllInputIdAliases().forEach(alias => inputIdAliases.add(alias))
    modelInputsR.getAllInputIdAliases().forEach(alias => inputIdAliases.add(alias))

    // Create two scenarios for each input, one with the input at its minimum, and one
    // with the input at its maximum.  If the input only exists on one side, we still
    // create a scenario for it, but it will be flagged in the UI to make it clear
    // that the input configuration has changed.
    for (const inputIdAlias of inputIdAliases) {
      const inputAtMin: CompareScenarioInputSpec = {
        kind: 'input-at-position',
        inputName: inputIdAlias,
        position: 'min'
      }
      const inputAtMax: CompareScenarioInputSpec = {
        kind: 'input-at-position',
        inputName: inputIdAlias,
        position: 'max'
      }
      resolvedScenarios.push(
        resolveScenarioForInputSpecs(modelInputsL, modelInputsR, undefined, undefined, [inputAtMin])
      )
      resolvedScenarios.push(
        resolveScenarioForInputSpecs(modelInputsL, modelInputsR, undefined, undefined, [inputAtMax])
      )
    }
  }

  return resolvedScenarios
}

/**
 * Return a resolved `CompareScenario` with all inputs set to the given position.
 */
function resolveScenarioWithAllInputsAtPosition(
  title: string | undefined,
  subtitle: string | undefined,
  position: InputPosition
): CompareScenarioWithAllInputs {
  if (title === undefined) {
    // No title was defined, so set one based on position (e.g., "at minimum")
    title = position.replace('-', ' ')
  }

  return {
    kind: 'scenario-with-all-inputs',
    title,
    subtitle,
    position
  }
}

/**
 * Return a resolved `CompareScenario` for the given inputs and positions/values.
 */
function resolveScenarioForInputSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  title: string | undefined,
  subtitle: string | undefined,
  inputSpecs: CompareScenarioInputSpec[]
): CompareScenario {
  // Convert the input specs to `CompareScenarioInput` instances
  const resolvedInputs = inputSpecs.map(inputSpec => {
    switch (inputSpec.kind) {
      case 'input-at-position':
        return resolveInputForName(modelInputsL, modelInputsR, inputSpec.inputName, inputSpec.position)
      case 'input-at-value':
        return resolveInputForName(modelInputsL, modelInputsR, inputSpec.inputName, inputSpec.value)
      default:
        assertNever(inputSpec)
    }
  })

  if (title === undefined) {
    // No title was defined, so set a default one based on input name.  For now we only
    // attempt this if there's a single input in the scenario.
    // if (resolvedInputs.length === 1 && resolvedInputs[0]) {
    // const setting = scenario.settings[0]
    //  this.getInfoForPositionSetting(setting.inputVarId, setting.position)
    // } else {
    //     title: `PLACEHOLDER (scenario info not provided)`
    //   }
    title = 'TODO: at position or value'
  }

  // Create a `CompareScenario` with the resolved inputs
  return {
    kind: 'scenario-with-inputs',
    title,
    subtitle,
    resolvedInputs
  }
}

/**
 * Return a resolved `CompareScenarioInput` for the given input name and position/value.
 */
function resolveInputForName(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  inputName: string,
  at: CompareScenarioInputPosition | number
): CompareScenarioInput {
  // Resolve the input in the context of each model
  return {
    requestedName: inputName,
    stateL: resolveInputForNameInModel(modelInputsL, inputName, at),
    stateR: resolveInputForNameInModel(modelInputsR, inputName, at)
  }
}

/**
 * Return a resolved `CompareScenarioInputState` for the given input name and position/value
 * in the context of a specific model.
 */
function resolveInputForNameInModel(
  modelInputs: ModelInputs,
  inputName: string,
  at: CompareScenarioInputPosition | number
): CompareScenarioInputState {
  // Find an input variable that matches the given name (either the actual variable name
  // or an alias)
  const inputVar = modelInputs.getInputVarForName(inputName)
  if (inputVar) {
    // Resolve the input at the given value or position
    return resolveInputVar(inputVar, at)
  } else {
    // No input variable found that matches the given name
    return {
      error: {
        kind: 'unknown-input'
      }
    }
  }
}

/**
 * Return a `CompareScenarioInputState` for the given input variable and position/value.
 */
function resolveInputVar(inputVar: InputVar, at: CompareScenarioInputPosition | number): CompareScenarioInputState {
  if (typeof at === 'number') {
    const value = at as number
    return resolveInputVarAtValue(inputVar, value)
  } else {
    const position = inputPosition(at as CompareScenarioInputPosition)
    return resolveInputVarAtPosition(inputVar, position)
  }
}

/**
 * Return a `CompareScenarioInputState` for the input at the given position.
 */
function resolveInputVarAtPosition(inputVar: InputVar, position: InputPosition): CompareScenarioInputState {
  return {
    inputVar,
    position,
    value: inputValueAtPosition(inputVar, position)
  }
}

/**
 * Return a `CompareScenarioInputState` for the input at the given value.
 */
function resolveInputVarAtValue(inputVar: InputVar, value: number): CompareScenarioInputState {
  // Check that the value is in the valid range
  // TODO: This may not be valid for switch inputs
  if (value >= inputVar.minValue && value <= inputVar.maxValue) {
    return {
      inputVar,
      value
    }
  } else {
    return {
      error: {
        kind: 'invalid-value'
      }
    }
  }
}

/**
 * Convert a `CompareScenarioInputPosition` (from the parser) to an `InputPosition` (used by `Scenario`).
 */
function inputPosition(position: CompareScenarioInputPosition): InputPosition | undefined {
  switch (position) {
    case 'default':
      return 'at-default'
    case 'min':
      return 'at-minimum'
    case 'max':
      return 'at-maximum'
    default:
      // Return undefined instead of using `assertNever` in the unlikely case that
      // the parser allowed an invalid position to sneak through
      return undefined
  }
}

/**
 * Get the value of the input at the given position.
 */
function inputValueAtPosition(inputVar: InputVar, position: InputPosition): number {
  switch (position) {
    case 'at-default':
      return inputVar.defaultValue
    case 'at-minimum':
      return inputVar.minValue
    case 'at-maximum':
      return inputVar.maxValue
    default:
      assertNever(position)
  }
}
