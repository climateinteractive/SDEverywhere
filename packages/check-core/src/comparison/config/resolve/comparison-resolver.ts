// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition, InputSetting, ScenarioSpec } from '../../../_shared/scenario-spec-types'
import { inputSettingsSpec } from '../../../_shared/scenario-specs'
import type { VarId } from '../../../_shared/types'

import type { BundleGraphId, InputSettingGroupId, ModelSpec } from '../../../bundle/bundle-types'
import { ModelInputs } from '../../../bundle/model-inputs'
import type { InputId, InputVar, OutputVar } from '../../../bundle/var-types'

import type {
  ComparisonDataset,
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
  ComparisonViewBox,
  ComparisonViewGroup,
  ComparisonViewRow
} from '../../_shared/comparison-resolved-types'

import type {
  ComparisonDatasetName,
  ComparisonDatasetSource,
  ComparisonGraphGroupId,
  ComparisonGraphGroupSpec,
  ComparisonGraphId,
  ComparisonScenarioGroupId,
  ComparisonScenarioGroupSpec,
  ComparisonScenarioInputName,
  ComparisonScenarioId,
  ComparisonScenarioInputPosition,
  ComparisonScenarioInputSpec,
  ComparisonScenarioRefSpec,
  ComparisonScenarioSpec,
  ComparisonScenarioSubtitle,
  ComparisonScenarioTitle,
  ComparisonSpecs,
  ComparisonViewBoxSpec,
  ComparisonViewGraphOrder,
  ComparisonViewGraphsSpec,
  ComparisonViewGroupSpec,
  ComparisonViewRowSpec,
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
 * @param modelSpecL The model spec for the "left" bundle being compared.
 * @param modelSpecR The model spec for the "right" bundle being compared.
 * @param specs The scenario and view specs that were parsed from YAML/JSON definitions.
 */
export function resolveComparisonSpecs(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  specs: ComparisonSpecs
): ComparisonResolvedDefs {
  let key = 1
  const genKey: GenKey = () => {
    return `${key++}` as ComparisonScenarioKey
  }

  // Create `ModelInputs` instances to make lookups easier
  const modelInputsL = new ModelInputs(modelSpecL)
  const modelInputsR = new ModelInputs(modelSpecR)

  // Create a `ModelOutputs` instance to make lookups easier
  const modelOutputs = new ModelOutputs(modelSpecL, modelSpecR)

  // Resolve the top-level scenario specs and convert to `ComparisonScenario` instances
  const resolvedScenarios = new ResolvedScenarios()
  for (const scenarioSpec of specs.scenarios || []) {
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
  for (const scenarioGroupSpec of specs.scenarioGroups || []) {
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

  // Resolve the top-level graph group specs
  const resolvedGraphGroups = new ResolvedGraphGroups()
  for (const graphGroupSpec of specs.graphGroups || []) {
    resolvedGraphGroups.add(graphGroupSpec)
  }

  // Resolve the view groups
  const resolvedViewGroups: ComparisonViewGroup[] = []
  for (const viewGroupSpec of specs.viewGroups || []) {
    const resolvedViewGroup = resolveViewGroupFromSpec(
      modelSpecL,
      modelSpecR,
      modelOutputs,
      resolvedScenarios,
      resolvedScenarioGroups,
      resolvedGraphGroups,
      viewGroupSpec
    )
    resolvedViewGroups.push(resolvedViewGroup)
  }

  return {
    scenarios: resolvedScenarios.getAll(),
    scenarioGroups: resolvedScenarioGroups.getAll(),
    viewGroups: resolvedViewGroups
  }
}

//
// DATASETS
//

// TODO: This isn't very efficient because it iterates over all datasets to match by
// variable and source name, but it likely is not used as much as scenario lookup; it
// is probably OK for now but should be improved eventually
class ModelOutputs {
  constructor(private readonly modelSpecL: ModelSpec, private readonly modelSpecR: ModelSpec) {}

  getDatasetForName(name: ComparisonDatasetName, source?: ComparisonDatasetSource): ComparisonDataset | undefined {
    // TODO: This doesn't currently handle renames; ideally this would delegate to the
    // existing `ComparisonDatasets` type, which does account for renamed variables.
    // For now, only look in the "right" model spec, and get the variable from the "left"
    // model spec if the keys match.
    function findOutputVar(modelSpec: ModelSpec): OutputVar | undefined {
      for (const outputVar of modelSpec.outputVars.values()) {
        if (outputVar.varName === name && outputVar.sourceName === source) {
          return outputVar
        }
      }
      return undefined
    }

    const outputVarR = findOutputVar(this.modelSpecR)
    if (outputVarR) {
      // XXX: See if there is a matching item in the "left" model spec
      const datasetKey = outputVarR.datasetKey
      const outputVarL = this.modelSpecL.outputVars.get(datasetKey)
      return {
        kind: 'dataset',
        key: datasetKey,
        outputVarL,
        outputVarR
      }
    } else {
      return undefined
    }
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

    case 'scenario-with-setting-group': {
      // Create one scenario in which the inputs are configured according to the
      // setting group defined for each model
      return [
        resolveScenarioForSettingGroup(
          modelInputsL,
          modelInputsR,
          genKey(),
          scenarioSpec.id,
          scenarioSpec.title,
          scenarioSpec.subtitle,
          scenarioSpec.settingGroupId
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
 * Return a resolved `ComparisonScenario` for the given input setting group
 */
function resolveScenarioForSettingGroup(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  key: ComparisonScenarioKey,
  id: ComparisonScenarioId | undefined,
  title: ComparisonScenarioTitle | undefined,
  subtitle: ComparisonScenarioSubtitle | undefined,
  settingGroupId: InputSettingGroupId
): ComparisonScenario {
  // XXX: Currently the `ComparisonScenarioInputSpec` must reference an input by
  // its full variable name or by its alias ("id 3").  But the lower-level
  // `InputSetting` interface only includes the input variable ID, so we need
  // to map from the variable ID to the variable name.
  function inputVarNameForVarId(modelInputs: ModelInputs, varId: VarId): ComparisonScenarioInputName {
    const inputVar = modelInputs.getInputVarForVarId(varId)
    if (inputVar !== undefined) {
      // Get the variable name
      return inputVar.varName
    } else {
      // XXX: It is not likely that a bundle will advertise an input setting group that references
      // an unknown variable, but in this case, we will use the variable ID as the variable name
      // and let the resolver fail later
      return varId
    }
  }

  // Convert an `InputPosition` into a `ComparisonScenarioInputPosition`
  function inputPositionForPosition(position: InputPosition): ComparisonScenarioInputPosition {
    switch (position) {
      case 'at-minimum':
        return 'min'
      case 'at-maximum':
        return 'max'
      case 'at-default':
        return 'default'
      default:
        throw new Error(`Unknown input position: ${position}`)
    }
  }

  // Convert an `InputSetting` into a `ComparisonScenarioInputSpec`
  function inputSpecForSetting(modelInputs: ModelInputs, inputSetting: InputSetting): ComparisonScenarioInputSpec {
    switch (inputSetting.kind) {
      case 'position':
        return {
          kind: 'input-at-position',
          inputName: inputVarNameForVarId(modelInputs, inputSetting.inputVarId),
          position: inputPositionForPosition(inputSetting.position)
        }
      case 'value':
        return {
          kind: 'input-at-value',
          inputName: inputVarNameForVarId(modelInputs, inputSetting.inputVarId),
          value: inputSetting.value
        }
      default:
        throw new Error(`Unknown input setting kind: ${inputSetting}`)
    }
  }

  // Convert the input settings given model into a set of `ComparisonScenarioInputSpec` instances
  function inputSpecsForSettingGroup(
    modelInputs: ModelInputs,
    inputSettings: InputSetting[]
  ): ComparisonScenarioInputSpec[] {
    return inputSettings.map(inputSetting => inputSpecForSetting(modelInputs, inputSetting))
  }

  // Convert the `InputSetting` instances to `ComparisonScenarioInputSpec` instances so that
  // we can use `resolveScenarioForDistinctInputSpecs` to handle the rest of the conversion.
  // Note that if the setting group is not defined for one or both models, the settings array
  // will be empty, but we will add the error state after the resolve step.
  const inputSettingsL = modelInputsL.modelSpec.inputSettingGroups?.get(settingGroupId) || []
  const inputSettingsR = modelInputsR.modelSpec.inputSettingGroups?.get(settingGroupId) || []
  const inputsL = inputSpecsForSettingGroup(modelInputsL, inputSettingsL)
  const inputsR = inputSpecsForSettingGroup(modelInputsR, inputSettingsR)

  // Resolve the scenario and inputs
  const scenario = resolveScenarioForDistinctInputSpecs(
    modelInputsL,
    modelInputsR,
    key,
    id,
    title,
    subtitle,
    inputsL,
    inputsR
  )

  // Helper function that converts a `ScenarioSpec` to a string for easier comparison (this
  // sorts the inputs by name and value)
  function scenarioString(scenario: ScenarioSpec): string {
    if (scenario.kind === 'input-settings') {
      const settings = scenario.settings.map(setting => {
        switch (setting.kind) {
          case 'position':
            return `${setting.inputVarId}=${setting.position}`
          case 'value':
            return `${setting.inputVarId}=${setting.value}`
          default:
            throw new Error(`Unexpected input setting kind: ${setting}`)
        }
      })
      return settings.sort().join('__')
    } else {
      throw new Error(`Unexpected scenario spec kind: ${scenario.kind}`)
    }
  }

  // Helper function that returns true if the two scenarios are identical (same inputs and values)
  function scenariosAreEqual(scenarioL: ScenarioSpec, scenarioR: ScenarioSpec): boolean {
    return scenarioString(scenarioL) === scenarioString(scenarioR)
  }

  // If the setting group is not defined for one or both models, add the error state
  function errorState(inputSettings: InputSetting[]): ComparisonScenarioInputState {
    if (inputSettings.length === 0) {
      return { error: { kind: 'unknown-input-setting-group' } }
    } else {
      return {}
    }
  }
  if (inputSettingsL.length === 0 || inputSettingsR.length === 0) {
    if (scenario.settings.kind === 'input-settings') {
      // Put the "unknown group" error at the beginning of the list
      const errorSetting: ComparisonScenarioInput = {
        requestedName: settingGroupId,
        stateL: errorState(inputSettingsL),
        stateR: errorState(inputSettingsR)
      }
      scenario.settings.inputs.unshift(errorSetting)
    }
    if (inputSettingsL.length === 0) {
      scenario.specL = undefined
    }
    if (inputSettingsR.length === 0) {
      scenario.specR = undefined
    }
  }

  // If the setting group is defined for both models, but the settings are different
  // (either the set of inputs is different or the values are different), add a warning
  // to the scenario so that it can be flagged in the UI
  if (scenario.settings.kind === 'input-settings') {
    if (scenario.specL && scenario.specR && !scenariosAreEqual(scenario.specL, scenario.specR)) {
      scenario.settings.settingsDiffer = true
    }
  }

  return scenario
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
// GRAPH GROUPS
//

// TODO: This doesn't currently check that the referenced graph IDs are available in one or both
// model specs
class ResolvedGraphGroups {
  /** The set of resolved graph groups, keyed by ID. */
  private readonly resolvedGroupsById: Map<ComparisonGraphGroupId, ComparisonGraphGroupSpec> = new Map()

  add(group: ComparisonGraphGroupSpec): void {
    // Add to the map of groups
    if (this.resolvedGroupsById.has(group.id)) {
      // TODO: Mark this as an error in the interface rather than throwing
      throw new Error(`Multiple graph groups defined with the same id (${group.id})`)
    }
    this.resolvedGroupsById.set(group.id, group)
  }

  getGroupForId(id: ComparisonGraphGroupId): ComparisonGraphGroupSpec | undefined {
    return this.resolvedGroupsById.get(id)
  }
}

//
// VIEWS
//

/**
 * Return the graphs "all" preset or the graph IDs from a view graphs spec.
 */
function resolveGraphsFromSpec(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  resolvedGraphGroups: ResolvedGraphGroups,
  graphsSpec: ComparisonViewGraphsSpec
): ComparisonGraphId[] {
  switch (graphsSpec.kind) {
    case 'graphs-preset': {
      switch (graphsSpec.preset) {
        case 'all': {
          // Get the union of all graph IDs appearing in either left or right
          const graphIds: Set<BundleGraphId> = new Set()
          const addGraphIds = (modelSpec: ModelSpec) => {
            if (modelSpec.graphSpecs) {
              for (const graphSpec of modelSpec.graphSpecs) {
                graphIds.add(graphSpec.id)
              }
            }
          }
          addGraphIds(modelSpecL)
          addGraphIds(modelSpecR)
          return [...graphIds]
        }
        default:
          assertNever(graphsSpec.preset)
      }
    }
    // eslint-disable-next-line no-fallthrough
    case 'graphs-array':
      return graphsSpec.graphIds
    case 'graph-group-ref': {
      const groupSpec = resolvedGraphGroups.getGroupForId(graphsSpec.groupId)
      if (groupSpec === undefined) {
        // TODO: Mark this as an error in the interface rather than throwing
        throw new Error(`No graph group found for id ${graphsSpec.groupId}`)
      }
      return groupSpec.graphIds
    }
    default:
      assertNever(graphsSpec)
  }
}

function resolveViewForScenarioId(
  resolvedScenarios: ResolvedScenarios,
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  scenarioId: ComparisonScenarioId,
  graphIds: ComparisonGraphId[],
  graphOrder: ComparisonViewGraphOrder
): ComparisonView | ComparisonUnresolvedView {
  const resolvedScenario = resolvedScenarios.getScenarioForId(scenarioId)
  if (resolvedScenario) {
    // Add the resolved view
    return resolveViewForScenario(viewTitle, viewSubtitle, resolvedScenario, graphIds, graphOrder)
  } else {
    // Add the unresolved view
    return unresolvedViewForScenarioId(viewTitle, viewSubtitle, scenarioId)
  }
}

function resolveViewForScenarioRefSpec(
  resolvedScenarios: ResolvedScenarios,
  refSpec: ComparisonScenarioRefSpec,
  graphIds: ComparisonGraphId[],
  graphOrder: ComparisonViewGraphOrder
): ComparisonView | ComparisonUnresolvedView {
  const resolvedScenario = resolvedScenarios.getScenarioForId(refSpec.scenarioId)
  if (resolvedScenario) {
    // Add the resolved view
    return resolveViewForScenario(refSpec.title, refSpec.subtitle, resolvedScenario, graphIds, graphOrder)
  } else {
    // Add the unresolved view
    return unresolvedViewForScenarioId(undefined, undefined, refSpec.scenarioId)
  }
}

function resolveViewForScenario(
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  resolvedScenario: ComparisonScenario,
  graphIds: ComparisonGraphId[],
  graphOrder: ComparisonViewGraphOrder
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
    graphIds,
    graphOrder
  }
}

interface ComparisonUnresolvedViewBox {
  kind: 'unresolved-view-box'
  datasetName?: ComparisonDatasetName
  datasetSource?: ComparisonDatasetSource
  scenarioId?: ComparisonScenarioId
}

function resolveViewBoxForSpec(
  modelOutputs: ModelOutputs,
  resolvedScenarios: ResolvedScenarios,
  boxSpec: ComparisonViewBoxSpec
): ComparisonViewBox | ComparisonUnresolvedViewBox {
  const resolvedDataset = modelOutputs.getDatasetForName(boxSpec.dataset.name, boxSpec.dataset.source)
  if (resolvedDataset === undefined) {
    return {
      kind: 'unresolved-view-box',
      datasetName: boxSpec.dataset.name,
      datasetSource: boxSpec.dataset.source
    }
  }

  const resolvedScenario = resolvedScenarios.getScenarioForId(boxSpec.scenarioId)
  if (resolvedScenario === undefined) {
    return {
      kind: 'unresolved-view-box',
      scenarioId: boxSpec.scenarioId
    }
  }

  return {
    kind: 'view-box',
    title: boxSpec.title,
    subtitle: boxSpec.subtitle,
    dataset: resolvedDataset,
    scenario: resolvedScenario
  }
}

function resolveViewRowForSpec(
  modelOutputs: ModelOutputs,
  resolvedScenarios: ResolvedScenarios,
  rowSpec: ComparisonViewRowSpec
): ComparisonViewRow | ComparisonUnresolvedViewBox {
  const resolvedBoxes: ComparisonViewBox[] = []
  for (const boxSpec of rowSpec.boxes) {
    const box = resolveViewBoxForSpec(modelOutputs, resolvedScenarios, boxSpec)
    if (box.kind === 'view-box') {
      resolvedBoxes.push(box)
    } else {
      return box
    }
  }

  return {
    kind: 'view-row',
    title: rowSpec.title,
    subtitle: rowSpec.subtitle,
    boxes: resolvedBoxes
  }
}

function resolveViewWithRowSpecs(
  modelOutputs: ModelOutputs,
  resolvedScenarios: ResolvedScenarios,
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  rowSpecs: ComparisonViewRowSpec[]
): ComparisonView | ComparisonUnresolvedView {
  const resolvedRows: ComparisonViewRow[] = []
  for (const rowSpec of rowSpecs) {
    const row = resolveViewRowForSpec(modelOutputs, resolvedScenarios, rowSpec)
    if (row.kind === 'view-row') {
      resolvedRows.push(row)
    } else {
      return unresolvedViewForScenarioId(viewTitle, viewSubtitle, row.scenarioId, row.datasetName, row.datasetSource)
    }
  }

  if (viewTitle === undefined) {
    viewTitle = 'Untitled view'
  }

  return {
    kind: 'view',
    title: viewTitle,
    subtitle: viewSubtitle,
    rows: resolvedRows,
    // TODO: The schema doesn't currently allow for graphs in a view that is defined
    // with rows.  Probably we should have different view types to make this more clear.
    graphIds: [],
    graphOrder: 'default'
  }
}

function unresolvedViewForScenarioId(
  viewTitle: ComparisonViewTitle | undefined,
  viewSubtitle: ComparisonViewSubtitle | undefined,
  scenarioId?: ComparisonScenarioId,
  datasetName?: ComparisonDatasetName,
  datasetSource?: ComparisonDatasetSource
): ComparisonUnresolvedView {
  return {
    kind: 'unresolved-view',
    title: viewTitle,
    subtitle: viewSubtitle,
    scenarioId,
    datasetName,
    datasetSource
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
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  modelOutputs: ModelOutputs,
  resolvedScenarios: ResolvedScenarios,
  resolvedScenarioGroups: ResolvedScenarioGroups,
  resolvedGraphGroups: ResolvedGraphGroups,
  viewGroupSpec: ComparisonViewGroupSpec
): ComparisonViewGroup {
  let views: (ComparisonView | ComparisonUnresolvedView)[]

  switch (viewGroupSpec.kind) {
    case 'view-group-with-views': {
      // Resolve each view
      views = viewGroupSpec.views.map(viewSpec => {
        if (viewSpec.scenarioId) {
          let graphIds: ComparisonGraphId[]
          if (viewSpec.graphs) {
            graphIds = resolveGraphsFromSpec(modelSpecL, modelSpecR, resolvedGraphGroups, viewSpec.graphs)
          } else {
            graphIds = []
          }
          return resolveViewForScenarioId(
            resolvedScenarios,
            viewSpec.title,
            viewSpec.subtitle,
            viewSpec.scenarioId,
            graphIds,
            viewSpec.graphOrder || 'default'
          )
        } else {
          return resolveViewWithRowSpecs(
            modelOutputs,
            resolvedScenarios,
            viewSpec.title,
            viewSpec.subtitle,
            viewSpec.rows
          )
        }
      })
      break
    }
    case 'view-group-with-scenarios': {
      // Resolve to one view for each scenario (with the same set of graphs for each view)
      const graphIds = resolveGraphsFromSpec(modelSpecL, modelSpecR, resolvedGraphGroups, viewGroupSpec.graphs)
      const graphOrder = viewGroupSpec.graphOrder || 'default'
      views = []
      for (const refSpec of viewGroupSpec.scenarios) {
        switch (refSpec.kind) {
          case 'scenario-ref':
            // Add a view for the scenario
            views.push(resolveViewForScenarioRefSpec(resolvedScenarios, refSpec, graphIds, graphOrder))
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
                    views.push(resolveViewForScenario(undefined, undefined, scenario, graphIds, graphOrder))
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
