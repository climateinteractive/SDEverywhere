// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition, InputSetting, ScenarioSpec } from '../../../_shared/scenario-spec-types'
import { inputSettingsSpec } from '../../../_shared/scenario-specs'

import type { ModelInputs } from '../../../bundle/model-inputs'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type {
  ComparisonScenario,
  ComparisonScenarioAllInputsSettings,
  ComparisonScenarioGroup,
  ComparisonScenarioInput,
  ComparisonScenarioInputSettings,
  ComparisonScenarioInputState,
  ComparisonScenarioKey,
  ComparisonUnresolvedScenarioRef,
  ComparisonUnresolvedView,
  ComparisonView,
  ComparisonViewGroup
} from '../../_shared/comparison-resolved-types'

import type {
  ComparisonScenarioGroupId,
  ComparisonScenarioGroupSpec,
  ComparisonScenarioId,
  ComparisonScenarioInputPosition,
  ComparisonScenarioInputSpec,
  ComparisonScenarioRefSpec,
  ComparisonScenarioSpec,
  ComparisonScenarioSubtitle,
  ComparisonScenarioTitle,
  ComparisonSpecs,
  ComparisonViewGraphId,
  ComparisonViewGraphsSpec,
  ComparisonViewGroupSpec,
  ComparisonViewSubtitle,
  ComparisonViewTitle
} from '../comparison-spec-types'
import { inputSettingFromResolvedInputState, scenarioSpecsFromSettings } from './comparison-scenario-specs'

export interface ComparisonResolvedDefs {
  /** The set of resolved scenarios. */
  scenarios: ComparisonScenario[]
  /** The set of resolved scenario groups. */
  scenarioGroups: ComparisonScenarioGroup[]
  /** The set of resolved view groups. */
  viewGroups: ComparisonViewGroup[]
}

type GenKey = () => ComparisonScenarioKey

/**
 * Expand and resolve all the provided scenario and view specs.  This will inspect all the
 * requested specs, resolve references to input variables and scenarios, and then return
 * the definitions for the fully resolved scenarios and views.
 *
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param specs The scenario and view specs that were parsed from YAML/JSON definitions.
 */
export function resolveComparisonSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  specs: ComparisonSpecs
): ComparisonResolvedDefs {
  let key = 1
  const genKey: GenKey = () => {
    return `${key++}` as ComparisonScenarioKey
  }

  // Resolve the top-level scenario specs and convert to `ComparisonScenario` instances
  const resolvedScenarios = new ResolvedScenarios()
  for (const scenarioSpec of specs.scenarios) {
    resolvedScenarios.add(resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioSpec, genKey))
  }

  // Resolve scenarios that are defined inside scenario groups and add them to the set of scenarios.
  // Note that we track the key for each scenario in the group so that we can preserve the key when
  // creating a copy/reference in the next step.
  interface PartiallyResolvedScenarioGroup {
    spec: ComparisonScenarioGroupSpec
    scenarios: (ComparisonScenario | ComparisonScenarioRefSpec)[]
  }
  const partiallyResolvedScenarioGroups: PartiallyResolvedScenarioGroup[] = []
  for (const scenarioGroupSpec of specs.scenarioGroups) {
    const scenariosForGroup: (ComparisonScenario | ComparisonScenarioRefSpec)[] = []
    for (const scenarioItem of scenarioGroupSpec.scenarios) {
      if (scenarioItem.kind === 'scenario-ref') {
        scenariosForGroup.push(scenarioItem)
      } else {
        const scenarios = resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioItem, genKey)
        resolvedScenarios.add(scenarios)
        scenariosForGroup.push(...scenarios)
      }
    }
    partiallyResolvedScenarioGroups.push({
      spec: scenarioGroupSpec,
      scenarios: scenariosForGroup
    })
  }

  // Now that all scenarios have been resolved, resolve the groups themselves.  Note that we do this as a
  // secondary pass after resolving all top-level and nested scenario definitions so that groups can refer
  // to scenarios that are defined elsewhere (order does not matter).
  const resolvedScenarioGroups = new ResolvedScenarioGroups()
  for (const partiallyResolvedGroup of partiallyResolvedScenarioGroups) {
    const scenariosForGroup: (ComparisonScenario | ComparisonUnresolvedScenarioRef)[] = []
    for (const scenarioItem of partiallyResolvedGroup.scenarios) {
      if (scenarioItem.kind === 'scenario-ref') {
        // See if we have a scenario defined for this ID
        const referencedScenario = resolvedScenarios.getScenarioForId(scenarioItem.scenarioId)
        if (referencedScenario) {
          // Found it; create a copy of it to allow for adding the title/subtitle overrides if provided.
          // Note that we use the same key as the original so that report references work correctly.
          const resolvedScenario = { ...referencedScenario }
          if (scenarioItem.title) {
            resolvedScenario.title = scenarioItem.title
          }
          if (scenarioItem.subtitle) {
            resolvedScenario.subtitle = scenarioItem.subtitle
          }
          scenariosForGroup.push(resolvedScenario)
        } else {
          // Not found, add an unresolved ref item to the group
          scenariosForGroup.push({
            kind: 'unresolved-scenario-ref',
            scenarioId: scenarioItem.scenarioId
          })
        }
      } else {
        // Add the fully resolved scenario to this group (using the same key as the original)
        scenariosForGroup.push(scenarioItem)
      }
    }
    resolvedScenarioGroups.add({
      kind: 'scenario-group',
      id: partiallyResolvedGroup.spec.id,
      title: partiallyResolvedGroup.spec.title,
      scenarios: scenariosForGroup
    })
  }

  // Resolve the view groups
  const resolvedViewGroups: ComparisonViewGroup[] = []
  for (const viewGroupSpec of specs.viewGroups) {
    const resolvedViewGroup = resolveViewGroupFromSpec(resolvedScenarios, resolvedScenarioGroups, viewGroupSpec)
    resolvedViewGroups.push(resolvedViewGroup)
  }

  return {
    scenarios: resolvedScenarios.getAll(),
    scenarioGroups: resolvedScenarioGroups.getAll(),
    viewGroups: resolvedViewGroups
  }
}

//
// SCENARIOS
//

class ResolvedScenarios {
  /** The array of all resolved scenarios. */
  private readonly resolvedScenarios: ComparisonScenario[] = []

  /** The set of resolved scenarios that include an ID, keyed by ID. */
  private readonly resolvedScenariosById: Map<ComparisonScenarioId, ComparisonScenario> = new Map()

  add(scenarios: ComparisonScenario[]): void {
    for (const resolvedScenario of scenarios) {
      // Add the scenario to the general set
      this.resolvedScenarios.push(resolvedScenario)

      // Also add to the map of scenarios with an ID, if one is defined
      if (resolvedScenario.id !== undefined) {
        // See if ID is already used
        // TODO: Mark this as an error in the interface rather than throwing
        if (this.resolvedScenariosById.has(resolvedScenario.id)) {
          throw new Error(`Multiple scenarios defined with the same id (${resolvedScenario.id})`)
        }
        this.resolvedScenariosById.set(resolvedScenario.id, resolvedScenario)
      }
    }
  }

  getAll(): ComparisonScenario[] {
    return this.resolvedScenarios
  }

  getScenarioForId(id: ComparisonScenarioId): ComparisonScenario | undefined {
    return this.resolvedScenariosById.get(id)
  }
}

/**
 * Return one or more resolved `ComparisonScenario` instances for the given scenario spec.
 */
function resolveScenariosFromSpec(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  scenarioSpec: ComparisonScenarioSpec,
  genKey: GenKey
): ComparisonScenario[] {
  switch (scenarioSpec.kind) {
    case 'scenario-matrix':
      // Create a matrix of scenarios
      return resolveScenarioMatrix(modelInputsL, modelInputsR, genKey)

    case 'scenario-with-all-inputs': {
      // Create an "all inputs at <position>" scenario
      const position = inputPosition(scenarioSpec.position)
      return [
        resolveScenarioWithAllInputsAtPosition(
          genKey(),
          scenarioSpec.id,
          scenarioSpec.title,
          scenarioSpec.subtitle,
          position
        )
      ]
    }

    case 'scenario-with-inputs': {
      // Create one scenario that contains the given input setting(s)
      return [
        resolveScenarioForInputSpecs(
          modelInputsL,
          modelInputsR,
          genKey(),
          scenarioSpec.id,
          scenarioSpec.title,
          scenarioSpec.subtitle,
          scenarioSpec.inputs
        )
      ]
    }

    case 'scenario-with-distinct-inputs': {
      // Create one scenario in which the inputs are configured differently
      // for the two models
      return [
        resolveScenarioForDistinctInputSpecs(
          modelInputsL,
          modelInputsR,
          genKey(),
          scenarioSpec.id,
          scenarioSpec.title,
          scenarioSpec.subtitle,
          scenarioSpec.inputsL,
          scenarioSpec.inputsR
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
  genKey: GenKey
): ComparisonScenario[] {
  const resolvedScenarios: ComparisonScenario[] = []

  // Add an "all inputs at default" scenario
  resolvedScenarios.push(
    resolveScenarioWithAllInputsAtPosition(genKey(), undefined, undefined, undefined, 'at-default')
  )

  // Get the union of all input IDs appearing on either side
  const inputIdAliases: Set<InputId> = new Set()
  modelInputsL.getAllInputIdAliases().forEach(alias => inputIdAliases.add(alias))
  modelInputsR.getAllInputIdAliases().forEach(alias => inputIdAliases.add(alias))

  // Create two scenarios for each input, one with the input at its minimum, and one
  // with the input at its maximum.  If the input only exists on one side, we still
  // create a scenario for it, but it will be flagged in the UI to make it clear
  // that the input configuration has changed.
  for (const inputIdAlias of inputIdAliases) {
    const inputAtMin: ComparisonScenarioInputSpec = {
      kind: 'input-at-position',
      inputName: inputIdAlias,
      position: 'min'
    }
    const inputAtMax: ComparisonScenarioInputSpec = {
      kind: 'input-at-position',
      inputName: inputIdAlias,
      position: 'max'
    }
    resolvedScenarios.push(
      resolveScenarioForInputSpecs(modelInputsL, modelInputsR, genKey(), undefined, undefined, undefined, [inputAtMin])
    )
    resolvedScenarios.push(
      resolveScenarioForInputSpecs(modelInputsL, modelInputsR, genKey(), undefined, undefined, undefined, [inputAtMax])
    )
  }

  return resolvedScenarios
}

/**
 * Return a resolved `ComparisonScenario` with all inputs set to the given position.
 */
function resolveScenarioWithAllInputsAtPosition(
  key: ComparisonScenarioKey,
  id: ComparisonScenarioId | undefined,
  title: ComparisonScenarioTitle | undefined,
  subtitle: ComparisonScenarioSubtitle | undefined,
  position: InputPosition
): ComparisonScenario {
  // Create the settings and specs
  const settings: ComparisonScenarioAllInputsSettings = {
    kind: 'all-inputs-settings',
    position
  }
  const [specL, specR] = scenarioSpecsFromSettings(settings)

  // Create a `ComparisonScenario` with the settings
  return {
    kind: 'scenario',
    key,
    id,
    title,
    subtitle,
    settings,
    specL,
    specR
  }
}

/**
 * Return a resolved `ComparisonScenario` for the given inputs and positions/values.
 */
function resolveScenarioForInputSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  key: ComparisonScenarioKey,
  id: ComparisonScenarioId | undefined,
  title: ComparisonScenarioTitle | undefined,
  subtitle: ComparisonScenarioSubtitle | undefined,
  inputSpecs: ComparisonScenarioInputSpec[]
): ComparisonScenario {
  // Convert the input specs to `ComparisonScenarioInput` instances
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

  // Create the settings and specs
  const settings: ComparisonScenarioInputSettings = {
    kind: 'input-settings',
    inputs: resolvedInputs
  }
  const [specL, specR] = scenarioSpecsFromSettings(settings)

  // Create a `ComparisonScenario` with the resolved inputs
  return {
    kind: 'scenario',
    key,
    id,
    title,
    subtitle,
    settings,
    specL,
    specR
  }
}

/**
 * Return a resolved `ComparisonScenario` for the given settings that are different
 * for the two models.
 */
function resolveScenarioForDistinctInputSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  key: ComparisonScenarioKey,
  id: ComparisonScenarioId | undefined,
  title: ComparisonScenarioTitle | undefined,
  subtitle: ComparisonScenarioSubtitle | undefined,
  inputSpecsL: ComparisonScenarioInputSpec[],
  inputSpecsR: ComparisonScenarioInputSpec[]
): ComparisonScenario {
  // TODO: Unlike the more typical "scenario with inputs" case, when we have "distinct"
  // inputs (separate sets of inputs for the two models) we only include the `settings`
  // array in the resulting `ComparisonScenario` if there are errors in resolving the
  // inputs.  If all inputs were resolved successfully, then the `settings` array will
  // be empty.  This is probably fine for now but it could stand to be redesigned.
  const inputsWithErrors: ComparisonScenarioInput[] = []

  // Resolve the input settings for the left and right sides separately
  const settingsL: InputSetting[] = []
  const settingsR: InputSetting[] = []

  // Helper function that resolves an input for the given model/side.  If the input is
  // resolved successfully, an `InputSetting` will be saved for that side.  Otherwise,
  // a `ComparisonScenarioInput` describing the error will be saved.
  function resolveInputSpec(
    side: 'left' | 'right',
    modelInputs: ModelInputs,
    inputSpec: ComparisonScenarioInputSpec
  ): void {
    let inputState: ComparisonScenarioInputState
    switch (inputSpec.kind) {
      case 'input-at-position':
        inputState = resolveInputForNameInModel(modelInputs, inputSpec.inputName, inputSpec.position)
        break
      case 'input-at-value':
        inputState = resolveInputForNameInModel(modelInputs, inputSpec.inputName, inputSpec.value)
        break
      default:
        assertNever(inputSpec)
    }

    if (inputState.error !== undefined) {
      // The input could not be resolved, so add it to the set of error inputs
      // TODO: For now we include an empty object (with undefined properties) for the
      // "other" side.  Maybe we can make the state properties optional, or maybe we
      // just need a less awkward way of handling these input states in the "distinct"
      // inputs case.
      inputsWithErrors.push({
        requestedName: inputSpec.inputName,
        stateL: side === 'left' ? inputState : {},
        stateR: side === 'right' ? inputState : {}
      })
    } else {
      // The input was resolved, so create a scenario that works for this side
      const inputSetting = inputSettingFromResolvedInputState(inputState)
      if (side === 'left') {
        settingsL.push(inputSetting)
      } else {
        settingsR.push(inputSetting)
      }
    }
  }

  // Resolve the input settings for the left and right sides separately
  inputSpecsL.forEach(inputSpec => resolveInputSpec('left', modelInputsL, inputSpec))
  inputSpecsR.forEach(inputSpec => resolveInputSpec('right', modelInputsR, inputSpec))

  // Create a `ScenarioSpec` for each side if there were no errors
  let specL: ScenarioSpec
  let specR: ScenarioSpec
  if (inputsWithErrors.length === 0) {
    specL = inputSettingsSpec(settingsL)
    specR = inputSettingsSpec(settingsR)
  }

  // Create a `ComparisonScenario` with the resolved inputs
  return {
    kind: 'scenario',
    key,
    id,
    title,
    subtitle,
    settings: {
      kind: 'input-settings',
      inputs: inputsWithErrors
    },
    specL,
    specR
  }
}

/**
 * Return a resolved `ComparisonScenarioInput` for the given input name and position/value.
 */
function resolveInputForName(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  inputName: string,
  at: ComparisonScenarioInputPosition | number
): ComparisonScenarioInput {
  // Resolve the input in the context of each model
  return {
    requestedName: inputName,
    stateL: resolveInputForNameInModel(modelInputsL, inputName, at),
    stateR: resolveInputForNameInModel(modelInputsR, inputName, at)
  }
}

/**
 * Return a resolved `ComparisonScenarioInputState` for the given input name and position/value
 * in the context of a specific model.
 */
function resolveInputForNameInModel(
  modelInputs: ModelInputs,
  inputName: string,
  at: ComparisonScenarioInputPosition | number
): ComparisonScenarioInputState {
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
 * Return a `ComparisonScenarioInputState` for the given input variable and position/value.
 */
function resolveInputVar(
  inputVar: InputVar,
  at: ComparisonScenarioInputPosition | number
): ComparisonScenarioInputState {
  if (typeof at === 'number') {
    const value = at as number
    return resolveInputVarAtValue(inputVar, value)
  } else {
    const position = inputPosition(at as ComparisonScenarioInputPosition)
    return resolveInputVarAtPosition(inputVar, position)
  }
}

/**
 * Return a `ComparisonScenarioInputState` for the input at the given position.
 */
function resolveInputVarAtPosition(inputVar: InputVar, position: InputPosition): ComparisonScenarioInputState {
  return {
    inputVar,
    position,
    value: inputValueAtPosition(inputVar, position)
  }
}

/**
 * Return a `ComparisonScenarioInputState` for the input at the given value.
 */
function resolveInputVarAtValue(inputVar: InputVar, value: number): ComparisonScenarioInputState {
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
 * Convert a `ComparisonScenarioInputPosition` (from the parser) to an `InputPosition` (used by `Scenario`).
 */
function inputPosition(position: ComparisonScenarioInputPosition): InputPosition | undefined {
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

class ResolvedScenarioGroups {
  /** The array of all resolved scenario groups. */
  private readonly resolvedGroups: ComparisonScenarioGroup[] = []

  /** The set of resolved scenario groups that include an ID, keyed by ID. */
  private readonly resolvedGroupsById: Map<ComparisonScenarioGroupId, ComparisonScenarioGroup> = new Map()

  add(group: ComparisonScenarioGroup): void {
    // Add the group to the general set
    this.resolvedGroups.push(group)

    // Also add to the map of groups with an ID, if one is defined
    if (group.id !== undefined) {
      // See if ID is already used
      // TODO: Mark this as an error in the interface rather than throwing
      if (this.resolvedGroupsById.has(group.id)) {
        throw new Error(`Multiple scenario groups defined with the same id (${group.id})`)
      }
      this.resolvedGroupsById.set(group.id, group)
    }
  }

  getAll(): ComparisonScenarioGroup[] {
    return this.resolvedGroups
  }

  getGroupForId(id: ComparisonScenarioGroupId): ComparisonScenarioGroup | undefined {
    return this.resolvedGroupsById.get(id)
  }
}

//
// VIEWS
//

/**
 * Return the graphs "all" preset or the graph IDs from a view graphs spec.
 */
function resolveGraphsFromSpec(graphsSpec: ComparisonViewGraphsSpec): 'all' | ComparisonViewGraphId[] {
  switch (graphsSpec.kind) {
    case 'graphs-preset':
      return 'all'
    case 'graphs-array':
      return graphsSpec.graphIds
    default:
      assertNever(graphsSpec)
  }
}

function resolveViewForScenarioId(
  resolvedScenarios: ResolvedScenarios,
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  scenarioId: ComparisonScenarioId,
  graphs: 'all' | ComparisonViewGraphId[]
): ComparisonView | ComparisonUnresolvedView {
  const resolvedScenario = resolvedScenarios.getScenarioForId(scenarioId)
  if (resolvedScenario) {
    // Add the resolved view
    return resolveViewForScenario(viewTitle, viewSubtitle, resolvedScenario, graphs)
  } else {
    // Add the unresolved view
    return unresolvedViewForScenarioId(viewTitle, viewSubtitle, scenarioId)
  }
}

function resolveViewForScenarioRefSpec(
  resolvedScenarios: ResolvedScenarios,
  refSpec: ComparisonScenarioRefSpec,
  graphs: 'all' | ComparisonViewGraphId[]
): ComparisonView | ComparisonUnresolvedView {
  const resolvedScenario = resolvedScenarios.getScenarioForId(refSpec.scenarioId)
  if (resolvedScenario) {
    // Add the resolved view
    return resolveViewForScenario(refSpec.title, refSpec.subtitle, resolvedScenario, graphs)
  } else {
    // Add the unresolved view
    return unresolvedViewForScenarioId(undefined, undefined, refSpec.scenarioId)
  }
}

function resolveViewForScenario(
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  resolvedScenario: ComparisonScenario,
  graphs: 'all' | ComparisonViewGraphId[]
): ComparisonView {
  // If explicit title/subtitle were not provided for the view, infer them from the scenario
  // TODO: For now we only infer the subtitle if an explicit title was also not provided; this might
  // be surprising if the user wants the title inferred but wants to provide an explicit subtitle
  if (viewTitle === undefined) {
    viewTitle = resolvedScenario.title
    if (viewTitle === undefined) {
      viewTitle = 'Untitled view'
    }
    if (viewSubtitle === undefined) {
      viewSubtitle = resolvedScenario.subtitle
    }
  }

  return {
    kind: 'view',
    title: viewTitle,
    subtitle: viewSubtitle,
    scenario: resolvedScenario,
    graphs
  }
}

function unresolvedViewForScenarioId(
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  scenarioId: ComparisonScenarioId
): ComparisonUnresolvedView {
  return {
    kind: 'unresolved-view',
    title: viewTitle,
    subtitle: viewSubtitle,
    scenarioId
  }
}

function unresolvedViewForScenarioGroupId(
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  scenarioGroupId: ComparisonScenarioGroupId
): ComparisonUnresolvedView {
  return {
    kind: 'unresolved-view',
    title: viewTitle,
    subtitle: viewSubtitle,
    scenarioGroupId
  }
}

//
// VIEW GROUPS
//

/**
 * Return a resolved `ComparisonViewGroup` instance for the given view group spec.
 */
function resolveViewGroupFromSpec(
  resolvedScenarios: ResolvedScenarios,
  resolvedScenarioGroups: ResolvedScenarioGroups,
  viewGroupSpec: ComparisonViewGroupSpec
): ComparisonViewGroup {
  let views: (ComparisonView | ComparisonUnresolvedView)[]

  switch (viewGroupSpec.kind) {
    case 'view-group-with-views': {
      // Resolve each view
      views = viewGroupSpec.views.map(viewSpec => {
        const graphs = resolveGraphsFromSpec(viewSpec.graphs)
        return resolveViewForScenarioId(
          resolvedScenarios,
          viewSpec.title,
          viewSpec.subtitle,
          viewSpec.scenarioId,
          graphs
        )
      })
      break
    }
    case 'view-group-with-scenarios': {
      // Resolve to one view for each scenario (with the same set of graphs for each view)
      const graphs = resolveGraphsFromSpec(viewGroupSpec.graphs)
      views = []
      for (const refSpec of viewGroupSpec.scenarios) {
        switch (refSpec.kind) {
          case 'scenario-ref':
            // Add a view for the scenario
            views.push(resolveViewForScenarioRefSpec(resolvedScenarios, refSpec, graphs))
            break
          case 'scenario-group-ref': {
            const resolvedGroup = resolvedScenarioGroups.getGroupForId(refSpec.groupId)
            if (resolvedGroup) {
              // Add a view for each scenario in the group
              for (const scenario of resolvedGroup.scenarios) {
                switch (scenario.kind) {
                  case 'unresolved-scenario-ref':
                    views.push(unresolvedViewForScenarioId(undefined, undefined, scenario.scenarioId))
                    break
                  case 'scenario':
                    views.push(resolveViewForScenario(undefined, undefined, scenario, graphs))
                    break
                  default:
                    assertNever(scenario)
                }
              }
            } else {
              // Add an unresolved view that covers the whole group
              views.push(unresolvedViewForScenarioGroupId(undefined, undefined, refSpec.groupId))
            }
            break
          }
          default:
            assertNever(refSpec)
        }
      }
      break
    }
    default:
      assertNever(viewGroupSpec)
  }

  return {
    kind: 'view-group',
    title: viewGroupSpec.title,
    views
  }
}
