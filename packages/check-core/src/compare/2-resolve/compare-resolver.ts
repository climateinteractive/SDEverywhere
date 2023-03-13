// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition } from '../../_shared/scenario'
import type { InputId, InputVar } from '../../bundle/var-types'

import type {
  CompareScenarioId,
  CompareScenarioInputPosition,
  CompareScenarioInputSpec,
  CompareScenarioSpec,
  CompareScenarioSubtitle,
  CompareScenarioTitle,
  CompareSpecs
} from '../_shared/compare-spec-types'
import type {
  CompareResolvedItems,
  CompareScenario,
  CompareScenarioGroup,
  CompareScenarioInput,
  CompareScenarioInputState,
  CompareScenarioWithAllInputs,
  CompareUnresolvedScenarioRef
} from '../_shared/compare-resolved-types'

import type { ModelInputs } from './model-inputs'

/**
 * Expand and resolve all the provided scenario and view specs.  This will inspect all the
 * requested specs, resolve references to input variables and scenarios, and then return
 * the metadata for the fully resolved scenarios and views.
 *
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param specs The scenario and view specs that were parsed from YAML/JSON definitions.
 * @param simplify If true, reduce the number of scenarios generated for a `matrix`
 * to make the tests run faster, otherwise expand the full set of scenarios.
 */
export function resolveSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  specs: CompareSpecs,
  simplify: boolean
): CompareResolvedItems {
  // Keep track of all resolved scenarios
  const resolvedScenarios: CompareScenario[] = []

  // Keep track of resolved scenarios that include an ID
  const resolvedScenariosById: Map<CompareScenarioId, CompareScenario> = new Map()

  function addResolvedScenarios(scenarios: CompareScenario[]): void {
    for (const resolvedScenario of scenarios) {
      // Add the scenario to the general set
      resolvedScenarios.push(resolvedScenario)

      // Also add to the map of scenarios with an ID, if one is defined
      if (resolvedScenario.id !== undefined) {
        // See if ID is already used
        // TODO: Mark this as an error in the interface rather than throwing
        if (resolvedScenariosById.has(resolvedScenario.id)) {
          throw new Error(`Multiple scenarios defined with the same id (${resolvedScenario.id})`)
        }
        resolvedScenariosById.set(resolvedScenario.id, resolvedScenario)
      }
    }
  }

  // Resolve the top-level scenario specs and convert to `CompareScenario` instances
  for (const scenarioSpec of specs.scenarios) {
    addResolvedScenarios([...resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioSpec, simplify)])
  }

  // Resolve scenarios that are defined inside scenario groups and add them to the set of scenarios
  for (const scenarioGroupSpec of specs.scenarioGroups) {
    for (const scenarioItem of scenarioGroupSpec.scenarios) {
      if (scenarioItem.kind !== 'scenario-ref') {
        addResolvedScenarios([...resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioItem, simplify)])
      }
    }
  }

  // Now that all scenarios have been resolved, resolve the groups themselves.  Note that we do this as a
  // secondary pass after resolving all top-level and nested scenario definitions so that groups can refer
  // to scenarios that are defined elsewhere (order does not matter).
  const resolvedScenarioGroups: CompareScenarioGroup[] = []
  for (const scenarioGroupSpec of specs.scenarioGroups) {
    const scenariosForGroup: (CompareScenario | CompareUnresolvedScenarioRef)[] = []
    for (const scenarioItem of scenarioGroupSpec.scenarios) {
      if (scenarioItem.kind === 'scenario-ref') {
        // See if we have a scenario defined for this ID
        const referencedScenario = resolvedScenariosById.get(scenarioItem.scenarioId)
        if (referencedScenario) {
          // Found it, add it to the group
          scenariosForGroup.push(referencedScenario)
        } else {
          // Not found, add an unresolved ref item to the group
          scenariosForGroup.push({
            kind: 'unresolved-scenario-ref',
            scenarioId: scenarioItem.scenarioId
          })
        }
      } else {
        // Add the fully resolved scenarios to this group
        scenariosForGroup.push(...resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioItem, simplify))
      }
    }
    resolvedScenarioGroups.push({
      kind: 'scenario-group',
      name: scenarioGroupSpec.name,
      scenarios: scenariosForGroup
    })
  }

  // TODO: viewGroups

  return {
    scenarios: resolvedScenarios,
    scenarioGroups: resolvedScenarioGroups,
    viewGroups: []
  }
}

//
// SCENARIOS
//

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
      return [
        resolveScenarioWithAllInputsAtPosition(scenarioSpec.id, scenarioSpec.title, scenarioSpec.subtitle, position)
      ]
    }

    case 'scenario-with-inputs': {
      // Create one scenario that contains the given input setting(s)
      return [
        resolveScenarioForInputSpecs(
          modelInputsL,
          modelInputsR,
          scenarioSpec.id,
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
  resolvedScenarios.push(resolveScenarioWithAllInputsAtPosition(undefined, undefined, undefined, 'at-default'))

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
        resolveScenarioForInputSpecs(modelInputsL, modelInputsR, undefined, undefined, undefined, [inputAtMin])
      )
      resolvedScenarios.push(
        resolveScenarioForInputSpecs(modelInputsL, modelInputsR, undefined, undefined, undefined, [inputAtMax])
      )
    }
  }

  return resolvedScenarios
}

/**
 * Return a resolved `CompareScenario` with all inputs set to the given position.
 */
function resolveScenarioWithAllInputsAtPosition(
  id: CompareScenarioId | undefined,
  title: CompareScenarioTitle | undefined,
  subtitle: CompareScenarioSubtitle | undefined,
  position: InputPosition
): CompareScenarioWithAllInputs {
  // TODO: Default title?
  // if (title === undefined) {
  //   // No title was defined, so set one based on position (e.g., "at minimum")
  //   title = position.replace('-', ' ')
  // }

  return {
    kind: 'scenario-with-all-inputs',
    id,
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
  id: CompareScenarioId | undefined,
  title: CompareScenarioTitle | undefined,
  subtitle: CompareScenarioSubtitle | undefined,
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
    // title = 'TODO: at position or value'
  }

  // Create a `CompareScenario` with the resolved inputs
  return {
    kind: 'scenario-with-inputs',
    id,
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

//
// SCENARIO GROUPS
//
