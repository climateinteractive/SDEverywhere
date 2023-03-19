// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition } from '../../../_shared/scenario-spec-types'

import type { ModelInputs } from '../../../bundle/model-inputs'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type {
  CompareScenario,
  CompareScenarioAllInputsSettings,
  CompareScenarioGroup,
  CompareScenarioInput,
  CompareScenarioInputSettings,
  CompareScenarioInputState,
  CompareScenarioKey,
  CompareUnresolvedScenarioRef,
  CompareUnresolvedView,
  CompareView,
  CompareViewGroup
} from '../../_shared/compare-resolved-types'

import type {
  CompareScenarioGroupId,
  CompareScenarioGroupSpec,
  CompareScenarioId,
  CompareScenarioInputPosition,
  CompareScenarioInputSpec,
  CompareScenarioRefSpec,
  CompareScenarioSpec,
  CompareScenarioSubtitle,
  CompareScenarioTitle,
  CompareSpecs,
  CompareViewGraphId,
  CompareViewGraphsSpec,
  CompareViewGroupSpec,
  CompareViewSubtitle,
  CompareViewTitle
} from '../compare-spec-types'
import { scenarioSpecsFromSettings } from './compare-scenario-specs'

export interface CompareResolvedDefs {
  /** The set of resolved scenarios. */
  scenarios: CompareScenario[]
  /** The set of resolved scenario groups. */
  scenarioGroups: CompareScenarioGroup[]
  /** The set of resolved view groups. */
  viewGroups: CompareViewGroup[]
}

type GenKey = () => CompareScenarioKey

/**
 * Expand and resolve all the provided scenario and view specs.  This will inspect all the
 * requested specs, resolve references to input variables and scenarios, and then return
 * the definitions for the fully resolved scenarios and views.
 *
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param specs The scenario and view specs that were parsed from YAML/JSON definitions.
 */
export function resolveCompareSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  specs: CompareSpecs
): CompareResolvedDefs {
  let key = 1
  const genKey: GenKey = () => {
    return `${key++}` as CompareScenarioKey
  }

  // Resolve the top-level scenario specs and convert to `CompareScenario` instances
  const resolvedScenarios = new ResolvedScenarios()
  for (const scenarioSpec of specs.scenarios) {
    resolvedScenarios.add(resolveScenariosFromSpec(modelInputsL, modelInputsR, scenarioSpec, genKey))
  }

  // Resolve scenarios that are defined inside scenario groups and add them to the set of scenarios.
  // Note that we track the key for each scenario in the group so that we can preserve the key when
  // creating a copy/reference in the next step.
  interface PartiallyResolvedScenarioGroup {
    spec: CompareScenarioGroupSpec
    scenarios: (CompareScenario | CompareScenarioRefSpec)[]
  }
  const partiallyResolvedScenarioGroups: PartiallyResolvedScenarioGroup[] = []
  for (const scenarioGroupSpec of specs.scenarioGroups) {
    const scenariosForGroup: (CompareScenario | CompareScenarioRefSpec)[] = []
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
    const scenariosForGroup: (CompareScenario | CompareUnresolvedScenarioRef)[] = []
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
  const resolvedViewGroups: CompareViewGroup[] = []
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
  private readonly resolvedScenarios: CompareScenario[] = []

  /** The set of resolved scenarios that include an ID, keyed by ID. */
  private readonly resolvedScenariosById: Map<CompareScenarioId, CompareScenario> = new Map()

  add(scenarios: CompareScenario[]): void {
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

  getAll(): CompareScenario[] {
    return this.resolvedScenarios
  }

  getScenarioForId(id: CompareScenarioId): CompareScenario | undefined {
    return this.resolvedScenariosById.get(id)
  }
}

/**
 * Return one or more resolved `CompareScenario` instances for the given scenario spec.
 */
function resolveScenariosFromSpec(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  scenarioSpec: CompareScenarioSpec,
  genKey: GenKey
): CompareScenario[] {
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
): CompareScenario[] {
  const resolvedScenarios: CompareScenario[] = []

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
      resolveScenarioForInputSpecs(modelInputsL, modelInputsR, genKey(), undefined, undefined, undefined, [inputAtMin])
    )
    resolvedScenarios.push(
      resolveScenarioForInputSpecs(modelInputsL, modelInputsR, genKey(), undefined, undefined, undefined, [inputAtMax])
    )
  }

  return resolvedScenarios
}

/**
 * Return a resolved `CompareScenario` with all inputs set to the given position.
 */
function resolveScenarioWithAllInputsAtPosition(
  key: CompareScenarioKey,
  id: CompareScenarioId | undefined,
  title: CompareScenarioTitle | undefined,
  subtitle: CompareScenarioSubtitle | undefined,
  position: InputPosition
): CompareScenario {
  // Create the settings and specs
  const settings: CompareScenarioAllInputsSettings = {
    kind: 'all-inputs-settings',
    position
  }
  const [specL, specR] = scenarioSpecsFromSettings(settings)

  // Create a `CompareScenario` with the settings
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
 * Return a resolved `CompareScenario` for the given inputs and positions/values.
 */
function resolveScenarioForInputSpecs(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  key: CompareScenarioKey,
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

  // Create the settings and specs
  const settings: CompareScenarioInputSettings = {
    kind: 'input-settings',
    inputs: resolvedInputs
  }
  const [specL, specR] = scenarioSpecsFromSettings(settings)

  // Create a `CompareScenario` with the resolved inputs
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

class ResolvedScenarioGroups {
  /** The array of all resolved scenario groups. */
  private readonly resolvedGroups: CompareScenarioGroup[] = []

  /** The set of resolved scenario groups that include an ID, keyed by ID. */
  private readonly resolvedGroupsById: Map<CompareScenarioGroupId, CompareScenarioGroup> = new Map()

  add(group: CompareScenarioGroup): void {
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

  getAll(): CompareScenarioGroup[] {
    return this.resolvedGroups
  }

  getGroupForId(id: CompareScenarioGroupId): CompareScenarioGroup | undefined {
    return this.resolvedGroupsById.get(id)
  }
}

//
// VIEWS
//

/**
 * Return the graphs "all" preset or the graph IDs from a view graphs spec.
 */
function resolveGraphsFromSpec(graphsSpec: CompareViewGraphsSpec): 'all' | CompareViewGraphId[] {
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
  viewTitle: CompareViewTitle | undefined,
  viewSubtitle: CompareViewSubtitle | undefined,
  scenarioId: CompareScenarioId,
  graphs: 'all' | CompareViewGraphId[]
): CompareView | CompareUnresolvedView {
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
  refSpec: CompareScenarioRefSpec,
  graphs: 'all' | CompareViewGraphId[]
): CompareView | CompareUnresolvedView {
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
  viewTitle: CompareViewTitle | undefined,
  viewSubtitle: CompareViewSubtitle | undefined,
  resolvedScenario: CompareScenario,
  graphs: 'all' | CompareViewGraphId[]
): CompareView {
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
  viewTitle: CompareViewTitle | undefined,
  viewSubtitle: CompareViewSubtitle | undefined,
  scenarioId: CompareScenarioId
): CompareUnresolvedView {
  return {
    kind: 'unresolved-view',
    title: viewTitle,
    subtitle: viewSubtitle,
    scenarioId
  }
}

function unresolvedViewForScenarioGroupId(
  viewTitle: CompareViewTitle | undefined,
  viewSubtitle: CompareViewSubtitle | undefined,
  scenarioGroupId: CompareScenarioGroupId
): CompareUnresolvedView {
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
 * Return a resolved `CompareViewGroup` instance for the given view group spec.
 */
function resolveViewGroupFromSpec(
  resolvedScenarios: ResolvedScenarios,
  resolvedScenarioGroups: ResolvedScenarioGroups,
  viewGroupSpec: CompareViewGroupSpec
): CompareViewGroup {
  let views: (CompareView | CompareUnresolvedView)[]

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
