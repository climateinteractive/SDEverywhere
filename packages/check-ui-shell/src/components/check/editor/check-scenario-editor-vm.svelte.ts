// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  InputVar,
  CheckScenario,
  CheckScenarioSpec,
  InputPosition,
  InputSetting,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import type { ScenarioInputPosition, ScenarioKind, GivenInputConfig, ScenarioItemConfig } from './check-editor-types'

/**
 * View model for managing scenario configurations in the check editor.
 */
export class CheckScenarioEditorViewModel {
  /** The list of scenarios. */
  public scenarios = $state<ScenarioItemConfig[]>([])

  /** The currently selected scenario ID. */
  public selectedScenarioId = $state<string | undefined>(undefined)

  /** List items for input variable selectors. */
  public readonly inputListItems: ListItemViewModel[]

  private nextScenarioId = 1

  /**
   * Create a new scenario editor view model.
   *
   * @param inputVars The list of input variables available in the model.
   */
  constructor(public readonly inputVars: InputVar[]) {
    this.inputListItems = this.inputVars.map(inputVar => ({
      id: inputVar.varId,
      label: inputVar.varName
    }))
  }

  /**
   * Clear all scenario state.
   */
  clear(): void {
    this.scenarios = []
    this.selectedScenarioId = undefined
    this.nextScenarioId = 1
  }

  /**
   * Add a new scenario with the specified kind.
   *
   * @param kind The kind of scenario to add.
   */
  addScenario(kind: ScenarioKind = 'all-inputs'): void {
    const newScenario: ScenarioItemConfig = {
      id: `scenario-${this.nextScenarioId++}`,
      kind
    }

    if (kind === 'all-inputs') {
      newScenario.position = 'at-default'
    } else if (kind === 'given-inputs') {
      // Start with one default input
      const firstInputVarId = this.inputVars.length > 0 ? this.inputVars[0].varId : ''
      newScenario.inputs = [{ inputVarId: firstInputVarId, position: 'at-default' }]
    }

    this.scenarios.push(newScenario)
    // Auto-select the new scenario
    this.selectedScenarioId = newScenario.id
  }

  /**
   * Add a scenario from a spec.
   *
   * @param spec The scenario spec to convert.
   */
  addScenarioFromSpec(spec: CheckScenarioSpec): void {
    const newScenario: ScenarioItemConfig = {
      id: `scenario-${this.nextScenarioId++}`,
      kind: 'all-inputs'
    }

    if (spec.preset === 'matrix') {
      newScenario.kind = 'all-inputs'
      newScenario.position = 'at-default'
    } else if (spec.with_inputs === 'all') {
      newScenario.kind = 'all-inputs'
      newScenario.position = this.convertPosition(spec.at)
    } else if (spec.with) {
      newScenario.kind = 'given-inputs'
      if (typeof spec.with === 'string') {
        // Single input
        newScenario.inputs = [
          {
            inputVarId: this.findInputVarId(spec.with),
            position: this.convertPosition(spec.at)
          }
        ]
      } else {
        // Multiple inputs
        newScenario.inputs = spec.with.map((inputSpec: { input: string; at: 'default' | 'min' | 'max' | number }) => ({
          inputVarId: this.findInputVarId(inputSpec.input),
          position: this.convertPosition(inputSpec.at)
        }))
      }
    } else {
      newScenario.position = 'at-default'
    }

    this.scenarios.push(newScenario)
  }

  /**
   * Add an input to a given-inputs scenario.
   *
   * @param scenarioId The scenario ID to add an input to.
   */
  addInputToScenario(scenarioId: string): void {
    const scenario = this.scenarios.find(s => s.id === scenarioId)
    if (scenario && scenario.kind === 'given-inputs') {
      if (!scenario.inputs) {
        scenario.inputs = []
      }
      const firstInputVarId = this.inputVars.length > 0 ? this.inputVars[0].varId : ''
      scenario.inputs.push({ inputVarId: firstInputVarId, position: 'at-default' })
    }
  }

  /**
   * Remove an input from a given-inputs scenario.
   *
   * @param scenarioId The scenario ID.
   * @param inputIndex The index of the input to remove.
   */
  removeInputFromScenario(scenarioId: string, inputIndex: number): void {
    const scenario = this.scenarios.find(s => s.id === scenarioId)
    if (scenario && scenario.kind === 'given-inputs' && scenario.inputs) {
      scenario.inputs.splice(inputIndex, 1)
    }
  }

  /**
   * Update an input in a given-inputs scenario.
   *
   * @param scenarioId The scenario ID.
   * @param inputIndex The index of the input to update.
   * @param updates The updates to apply.
   */
  updateScenarioInput(scenarioId: string, inputIndex: number, updates: Partial<GivenInputConfig>): void {
    const scenarioIndex = this.scenarios.findIndex(s => s.id === scenarioId)
    if (scenarioIndex !== -1) {
      const scenario = this.scenarios[scenarioIndex]
      if (scenario.kind === 'given-inputs' && scenario.inputs && scenario.inputs[inputIndex]) {
        // Replace the entire scenario to trigger reactivity
        const newInputs = [...scenario.inputs]
        newInputs[inputIndex] = { ...newInputs[inputIndex], ...updates }
        this.scenarios[scenarioIndex] = { ...scenario, inputs: newInputs }
      }
    }
  }

  /**
   * Select a scenario by ID.
   *
   * @param id The scenario ID to select.
   */
  selectScenario(id: string): void {
    this.selectedScenarioId = id
  }

  /**
   * Remove a scenario by ID.
   *
   * @param id The scenario ID to remove.
   */
  removeScenario(id: string): void {
    const index = this.scenarios.findIndex(s => s.id === id)
    if (index !== -1) {
      this.scenarios.splice(index, 1)
      // If we removed the selected scenario, select another one
      if (this.selectedScenarioId === id && this.scenarios.length > 0) {
        // Select the previous item, or the first item if we removed the first
        const newIndex = Math.max(0, index - 1)
        this.selectedScenarioId = this.scenarios[newIndex].id
      }
    }
  }

  /**
   * Update a scenario's configuration.
   *
   * @param id The scenario ID to update.
   * @param updates The updates to apply.
   */
  updateScenario(id: string, updates: Partial<ScenarioItemConfig>): void {
    const index = this.scenarios.findIndex(s => s.id === id)
    if (index !== -1) {
      // Replace the scenario object to trigger reactivity
      this.scenarios[index] = { ...this.scenarios[index], ...updates }
    }
  }

  /**
   * Create a check scenario from a scenario item config.
   *
   * @param config The scenario item configuration.
   * @returns The check scenario.
   */
  createCheckScenario(config: ScenarioItemConfig): CheckScenario {
    if (config.kind === 'all-inputs') {
      const position = this.toInputPosition(config.position || 'at-default')
      return {
        spec: {
          kind: 'all-inputs',
          uid: `all_inputs_at_${this.positionKey(position)}`,
          position
        },
        inputDescs: []
      }
    } else if (config.kind === 'given-inputs' && config.inputs && config.inputs.length > 0) {
      // Create InputSettings for each input
      const settings: InputSetting[] = config.inputs.map(input => {
        if (input.position === 'at-value' && input.customValue !== undefined) {
          // Value setting for custom value
          return {
            kind: 'value' as const,
            inputVarId: input.inputVarId,
            value: input.customValue
          }
        } else {
          // Position setting for preset positions
          const position = this.toInputPosition(input.position)
          return {
            kind: 'position' as const,
            inputVarId: input.inputVarId,
            position
          }
        }
      })

      // Create the UID from all settings
      const uidParts = settings.map(setting => {
        if (setting.kind === 'position') {
          return `${setting.inputVarId}_at_${this.positionKey(setting.position)}`
        } else {
          return `${setting.inputVarId}_at_${setting.value}`
        }
      })
      const uid = `inputs_${uidParts.sort().join('_')}`

      // Create the scenario spec
      const spec: ScenarioSpec = {
        kind: 'input-settings',
        uid,
        settings
      }

      return {
        spec,
        inputDescs: []
      }
    } else {
      // Default to all-inputs
      return {
        spec: {
          kind: 'all-inputs',
          uid: 'all_inputs_at_default',
          position: 'at-default'
        },
        inputDescs: []
      }
    }
  }

  /**
   * Create a default check scenario (all inputs at default position).
   *
   * @returns The default check scenario.
   */
  createDefaultCheckScenario(): CheckScenario {
    return {
      spec: {
        kind: 'all-inputs',
        uid: 'all-inputs-at-default',
        position: 'at-default'
      },
      inputDescs: []
    }
  }

  /**
   * Convert a position from spec format to our format.
   *
   * @param at The position from the spec.
   * @returns The position in our format.
   */
  convertPosition(at: 'default' | 'min' | 'max' | number | undefined): ScenarioInputPosition {
    if (at === undefined || at === 'default') {
      return 'at-default'
    }
    if (at === 'min') {
      return 'at-minimum'
    }
    if (at === 'max') {
      return 'at-maximum'
    }
    // For numeric values, we would use 'at-value' but need to also set customValue;
    // this is handled specially in the caller
    return 'at-value'
  }

  /**
   * Convert a ScenarioInputPosition to an InputPosition for the check-core API.
   * Custom values ('at-value') are converted to 'at-default' for preview purposes.
   *
   * @param position The scenario input position.
   * @returns The InputPosition for check-core.
   */
  toInputPosition(position: ScenarioInputPosition): InputPosition {
    if (position === 'at-value') {
      return 'at-default'
    }
    return position
  }

  /**
   * Convert an InputPosition to a short key for use in UIDs.
   *
   * @param position The input position.
   * @returns The key string.
   */
  positionKey(position: InputPosition): string {
    switch (position) {
      case 'at-default':
        return 'default'
      case 'at-minimum':
        return 'min'
      case 'at-maximum':
        return 'max'
    }
  }

  /**
   * Find an input variable ID by name.
   *
   * @param name The variable name.
   * @returns The variable ID, or empty string if not found.
   */
  findInputVarId(name: string): string {
    const inputVar = this.inputVars.find(v => v.varName === name)
    return inputVar?.varId || ''
  }
}
