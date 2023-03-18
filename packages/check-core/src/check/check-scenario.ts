// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type { InputPosition, ScenarioSpec } from '../_shared/scenario-spec-types'
import {
  allInputsAtPositionSpec,
  inputAtPositionSpec,
  inputSettingsSpec,
  positionSetting,
  valueSetting
} from '../_shared/scenario-specs'

import type { ModelSpec } from '../bundle/bundle-types'
import type { InputVar } from '../bundle/var-types'

import type { CheckScenarioInputSpec, CheckScenarioPosition, CheckScenarioSpec } from './check-spec'

export interface CheckScenarioError {
  kind: 'unknown-input-group' | 'empty-input-group'
  /** The name of the input group that failed to match. */
  name: string
}

export interface CheckScenarioInputDesc {
  /** The name of the input. */
  name: string
  /** The matched input variable; can be undefined if no input matched. */
  inputVar?: InputVar
  /** The position of the input, if this is a position scenario. */
  position?: InputPosition
  /** The value of the input, for the given position or explicit value. */
  value?: number
}

export interface CheckScenario {
  /** The spec used to configure the model with the matched input(s); can be undefined if input(s) failed to match. */
  spec?: ScenarioSpec
  /** The name of the associated input group, if any. */
  inputGroupName?: string
  /** The descriptions of the inputs; if empty, it is an "all inputs" scenario. */
  inputDescs: CheckScenarioInputDesc[]
  /** The error info if the scenario/input query failed to match. */
  error?: CheckScenarioError
}

/**
 * Return the list of scenarios that can be expanded from the given specs.
 *
 * @param modelSpec The model spec that provides input var information.
 * @param scenarioSpecs The scenario specs from a check test.
 * @param simplify If true, reduce the number of scenarios generated for a `matrix`
 * to make the tests run faster, otherwise expand the full set of scenarios.
 */
export function expandScenarios(
  modelSpec: ModelSpec,
  scenarioSpecs: CheckScenarioSpec[],
  simplify: boolean
): CheckScenario[] {
  // When no scenarios are provided, default to "all inputs at default"
  if (scenarioSpecs.length === 0) {
    const scenarioSpec: CheckScenarioSpec = {
      with_inputs: 'all',
      at: 'default'
    }
    return checkScenariosFromSpec(modelSpec, scenarioSpec, simplify)
  }

  // Otherwise, convert the specs to actual `CheckScenario` instances
  const checkScenarios: CheckScenario[] = []
  for (const scenarioSpec of scenarioSpecs) {
    checkScenarios.push(...checkScenariosFromSpec(modelSpec, scenarioSpec, simplify))
  }
  return checkScenarios
}

/**
 * Convert a `CheckScenarioPosition` (from the parser) to an `InputPosition` (used by `Scenario`).
 */
function inputPosition(position: CheckScenarioPosition): InputPosition | undefined {
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

/**
 * Return an input description for the input at the given position.
 */
function inputDescAtPosition(inputVar: InputVar, position: InputPosition): CheckScenarioInputDesc {
  return {
    name: inputVar.varName,
    inputVar,
    position,
    value: inputValueAtPosition(inputVar, position)
  }
}

/**
 * Return an input description for the input at the given value.
 */
function inputDescAtValue(inputVar: InputVar, value: number): CheckScenarioInputDesc {
  return {
    name: inputVar.varName,
    inputVar,
    value
  }
}

/**
 * Return an input description for the given input variable.
 */
function inputDescForVar(inputVar: InputVar, at: CheckScenarioPosition | number): CheckScenarioInputDesc {
  if (typeof at === 'number') {
    const value = at as number
    return inputDescAtValue(inputVar, value)
  } else {
    const position = inputPosition(at as CheckScenarioPosition)
    return inputDescAtPosition(inputVar, position)
  }
}

/**
 * Return an input description for the given input name and position/value.
 */
function inputDescForName(
  modelSpec: ModelSpec,
  inputName: string,
  at: CheckScenarioPosition | number
): CheckScenarioInputDesc {
  // Find an input variable that matches the given name
  // TODO: Use ModelInputs here
  const inputNameToMatch = inputName.toLowerCase()
  const inputVar = [...modelSpec.inputVars.values()].find(inputVar => {
    return inputVar.varName.toLowerCase() === inputNameToMatch
  })

  if (inputVar) {
    // Get a description of the input at the given value or position
    return inputDescForVar(inputVar, at)
  } else {
    // No input variable found that matches the given name; return with `inputVar`
    // left undefined so that we can report the error later
    return {
      name: inputName
    }
  }
}

/**
 * Return the input group that matches the given name.
 */
function groupForName(modelSpec: ModelSpec, groupName: string): [string, InputVar[]] | undefined {
  if (modelSpec.inputGroups) {
    // Ignore case when matching by group
    const groupToMatch = groupName.toLowerCase()

    // Find the group that matches the given name
    for (const [group, inputVars] of modelSpec.inputGroups) {
      if (group.toLowerCase() === groupToMatch) {
        return [group, inputVars]
      }
    }
  }

  // No match
  return undefined
}

/**
 * Return a `CheckScenario` that includes error info for an unresolved input group.
 */
function errorScenarioForInputGroup(
  kind: 'unknown-input-group' | 'empty-input-group',
  groupName: string
): CheckScenario {
  return {
    inputDescs: [],
    error: {
      kind,
      name: groupName
    }
  }
}

/**
 * Return a `CheckScenario` with all inputs at the given position.
 */
function checkScenarioWithAllInputsAtPosition(position: InputPosition): CheckScenario {
  return {
    spec: allInputsAtPositionSpec(position),
    inputDescs: []
  }
}

/**
 * Return a `CheckScenario` with the input at the given position.
 */
function checkScenarioWithInputAtPosition(inputVar: InputVar, position: InputPosition): CheckScenario {
  const varId = inputVar.varId
  return {
    spec: inputAtPositionSpec(varId, position),
    inputDescs: [inputDescAtPosition(inputVar, position)]
  }
}

/**
 * Return a `CheckScenario` for the given input descriptions.
 */
function checkScenarioForInputDescs(
  groupName: string | undefined,
  inputDescs: CheckScenarioInputDesc[]
): CheckScenario {
  let spec: ScenarioSpec
  if (inputDescs.every(desc => desc.inputVar !== undefined)) {
    // All inputs were resolved, so create a `ScenarioSpec` that includes them all
    const settings = inputDescs.map(inputDesc => {
      const varId = inputDesc.inputVar.varId
      if (inputDesc.position) {
        return positionSetting(varId, inputDesc.position)
      } else {
        return valueSetting(varId, inputDesc.value)
      }
    })
    spec = inputSettingsSpec(settings)
  } else {
    // One or more inputs could not be resolved; leave `spec` undefined
    // so that we can report the error later
    spec = undefined
  }

  return {
    spec,
    inputGroupName: groupName,
    inputDescs
  }
}

/**
 * Return a `CheckScenario` for the given inputs and positions/values.
 */
function checkScenarioForInputSpecs(modelSpec: ModelSpec, inputSpecs: CheckScenarioInputSpec[]): CheckScenario {
  // Convert the input specs to `CheckScenarioInputDesc` instances
  const inputDescs = inputSpecs.map(inputSpec => {
    return inputDescForName(modelSpec, inputSpec.input, inputSpec.at)
  })

  // Create a `CheckScenario` with the input descriptions
  return checkScenarioForInputDescs(undefined, inputDescs)
}

/**
 * Return a matrix of scenarios that covers all inputs for the given model.
 */
function checkScenarioMatrix(modelSpec: ModelSpec, simplify: boolean): CheckScenario[] {
  const checkScenarios: CheckScenario[] = []
  checkScenarios.push(checkScenarioWithAllInputsAtPosition('at-default'))
  if (!simplify) {
    checkScenarios.push(checkScenarioWithAllInputsAtPosition('at-minimum'))
    checkScenarios.push(checkScenarioWithAllInputsAtPosition('at-maximum'))
    for (const inputVar of modelSpec.inputVars.values()) {
      checkScenarios.push(checkScenarioWithInputAtPosition(inputVar, 'at-minimum'))
      checkScenarios.push(checkScenarioWithInputAtPosition(inputVar, 'at-maximum'))
    }
  }
  return checkScenarios
}

/**
 * Return a `CheckScenario` with all inputs in the given group at a position.
 */
function checkScenarioWithAllInputsInGroupAtPosition(
  modelSpec: ModelSpec,
  groupName: string,
  position: CheckScenarioPosition
): CheckScenario {
  // Find the group that matches the given name
  const result = groupForName(modelSpec, groupName)
  if (result === undefined) {
    // We didn't match a group; return an empty scenario with the group name so that
    // we can report the error later
    return errorScenarioForInputGroup('unknown-input-group', groupName)
  }
  const [matchedGroupName, inputVars] = result
  if (inputVars.length === 0) {
    return errorScenarioForInputGroup('empty-input-group', matchedGroupName)
  }

  // Get a description of each input in the group
  const inputDescs: CheckScenarioInputDesc[] = []
  for (const inputVar of inputVars) {
    inputDescs.push(inputDescForVar(inputVar, position))
  }

  // Create a `CheckScenario` with the input descriptions
  return checkScenarioForInputDescs(matchedGroupName, inputDescs)
}

/**
 * Return a set of scenarios, with one scenario for each input in the given group.
 */
function checkScenariosForEachInputInGroup(
  modelSpec: ModelSpec,
  groupName: string,
  position: CheckScenarioPosition
): CheckScenario[] {
  // Find the group that matches the given name
  const result = groupForName(modelSpec, groupName)
  if (result === undefined) {
    // We didn't match a group; return an empty scenario with the group name so that
    // we can report the error later
    return [errorScenarioForInputGroup('unknown-input-group', groupName)]
  }
  const [matchedGroupName, inputVars] = result
  if (inputVars.length === 0) {
    return [errorScenarioForInputGroup('empty-input-group', matchedGroupName)]
  }

  // Create one scenario for each input in the group
  const checkScenarios: CheckScenario[] = []
  for (const inputVar of inputVars) {
    // Get a description of the input at the given value or position,
    // then create a scenario with it
    const inputDesc = inputDescForVar(inputVar, position)
    // TODO: It might be more appropriate to use the group name as the group
    // key here (instead of deriving it from the input name)
    checkScenarios.push(checkScenarioForInputDescs(undefined, [inputDesc]))
  }

  return checkScenarios
}

/**
 * Return one or more `CheckScenario` instances for the given scenario spec.
 */
function checkScenariosFromSpec(
  modelSpec: ModelSpec,
  scenarioSpec: CheckScenarioSpec,
  simplify: boolean
): CheckScenario[] {
  if (scenarioSpec.preset === 'matrix') {
    // Create a matrix of scenarios
    return checkScenarioMatrix(modelSpec, simplify)
  }

  if (scenarioSpec.scenarios_for_each_input_in !== undefined) {
    // Create multiple scenarios (one scenario for each input in the given group)
    const groupName = scenarioSpec.scenarios_for_each_input_in
    const position = scenarioSpec.at as CheckScenarioPosition
    return checkScenariosForEachInputInGroup(modelSpec, groupName, position)
  }

  if (scenarioSpec.with !== undefined) {
    if (Array.isArray(scenarioSpec.with)) {
      // Create one scenario that contains the given input settings
      const inputSpecs = scenarioSpec.with as CheckScenarioInputSpec[]
      return [checkScenarioForInputSpecs(modelSpec, inputSpecs)]
    } else {
      // Create a single "input at <position|value>" scenario
      const inputSpec: CheckScenarioInputSpec = {
        input: scenarioSpec.with,
        at: scenarioSpec.at
      }
      return [checkScenarioForInputSpecs(modelSpec, [inputSpec])]
    }
  }

  if (scenarioSpec.with_inputs === 'all') {
    // Create an "all inputs at <position>" scenario
    const position = inputPosition(scenarioSpec.at as CheckScenarioPosition)
    return [checkScenarioWithAllInputsAtPosition(position)]
  }

  if (scenarioSpec.with_inputs_in !== undefined) {
    // Create one scenario that sets all inputs in the given group to a position
    const groupName = scenarioSpec.with_inputs_in
    const position = scenarioSpec.at as CheckScenarioPosition
    return [checkScenarioWithAllInputsInGroupAtPosition(modelSpec, groupName, position)]
  }

  // Internal error
  throw new Error(`Unhandled scenario spec: ${JSON.stringify(scenarioSpec)}`)
}
