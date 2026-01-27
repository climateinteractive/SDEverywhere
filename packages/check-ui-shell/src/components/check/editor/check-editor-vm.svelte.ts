// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  InputVar,
  OutputVar,
  CheckDataCoordinator,
  CheckScenario,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckPredicateTimeSpec,
  CheckDataRef,
  CheckDataset,
  InputPosition,
  InputSetting,
  ScenarioSpec
} from '@sdeverywhere/check-core'
import yaml from 'yaml'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

// Re-export all types from the types file
export type {
  CheckScenarioSpec,
  CheckDatasetSpec,
  CheckPredicateSpec,
  CheckTestSpec,
  CheckGroupSpec,
  ScenarioInputPosition,
  PredicateType,
  ScenarioKind,
  GivenInputConfig,
  ScenarioItemConfig,
  PredicateRefKind,
  PredicateDatasetRefKind,
  PredicateScenarioRefKind,
  PredicateScenarioConfig,
  PredicateRefConfig,
  TimeBoundType,
  PredicateTimeConfig,
  PredicateItemConfig,
  DatasetItemConfig,
  CheckTestConfig
} from './check-editor-types'

import type {
  CheckScenarioSpec,
  CheckDatasetSpec,
  CheckPredicateSpec,
  CheckTestSpec,
  CheckGroupSpec,
  ScenarioInputPosition,
  PredicateType,
  ScenarioKind,
  GivenInputConfig,
  ScenarioItemConfig,
  PredicateItemConfig,
  PredicateTimeConfig,
  PredicateRefConfig,
  PredicateScenarioConfig,
  DatasetItemConfig,
  CheckTestConfig
} from './check-editor-types'

/** View model for the check test editor. */
export class CheckEditorViewModel {
  // Test description text fields
  public describeText = $state('Variable or group')
  public testText = $state('should [have behavior] when...')

  // Reactive state for managing collections of items
  public scenarios = $state<ScenarioItemConfig[]>([])
  public datasets = $state<DatasetItemConfig[]>([])
  public predicates = $state<PredicateItemConfig[]>([])

  // Selection state
  public selectedScenarioId = $state<string | undefined>(undefined)
  public selectedDatasetId = $state<string | undefined>(undefined)
  public selectedPredicateId = $state<string | undefined>(undefined)

  // Derived state
  public datasetListItems: ListItemViewModel[]
  public inputListItems: ListItemViewModel[]

  /** Called when the user saves the check test. */
  public onSave?: (config: CheckTestConfig) => void

  /** Called when the user cancels editing. */
  public onCancel?: () => void

  private nextScenarioId = 1
  private nextDatasetId = 1
  private nextPredicateId = 1

  /**
   * @param inputVars The list of input variables available in the model.
   * @param outputVars The list of output variables available in the model.
   * @param dataCoordinator The data coordinator for fetching datasets.
   */
  constructor(
    public readonly inputVars: InputVar[],
    public readonly outputVars: OutputVar[],
    private readonly dataCoordinator: CheckDataCoordinator
  ) {
    // Create list items for selectors
    this.datasetListItems = this.outputVars.map(outputVar => ({
      id: outputVar.datasetKey,
      label: outputVar.varName
    }))

    this.inputListItems = this.inputVars.map(inputVar => ({
      id: inputVar.varId,
      label: inputVar.varName
    }))

    // Initialize with default items
    this.addScenario()
    this.addDataset()
    this.addPredicate()
  }

  /**
   * Clear all editor state.
   */
  clear(): void {
    this.describeText = 'Variable or group'
    this.testText = 'should [have behavior] when...'
    this.scenarios = []
    this.datasets = []
    this.predicates = []
    this.selectedScenarioId = undefined
    this.selectedDatasetId = undefined
    this.selectedPredicateId = undefined
    this.nextScenarioId = 1
    this.nextDatasetId = 1
    this.nextPredicateId = 1
  }

  /**
   * Initialize the editor from a group spec and test spec.
   *
   * @param groupSpec The group spec containing the describe text.
   * @param testSpec The test spec to load.
   */
  initFromSpec(groupSpec: CheckGroupSpec, testSpec: CheckTestSpec): void {
    this.clear()

    // Set description texts
    this.describeText = groupSpec.describe
    this.testText = testSpec.it

    // Convert scenarios
    if (testSpec.scenarios && testSpec.scenarios.length > 0) {
      for (const scenarioSpec of testSpec.scenarios) {
        this.addScenarioFromSpec(scenarioSpec)
      }
    } else {
      // Default to all-inputs at default
      this.addScenario('all-inputs')
    }

    // Convert datasets
    if (testSpec.datasets && testSpec.datasets.length > 0) {
      for (const datasetSpec of testSpec.datasets) {
        this.addDatasetFromSpec(datasetSpec)
      }
    } else {
      this.addDataset()
    }

    // Convert predicates
    if (testSpec.predicates && testSpec.predicates.length > 0) {
      for (const predicateSpec of testSpec.predicates) {
        this.addPredicateFromSpec(predicateSpec)
      }
    } else {
      this.addPredicate()
    }

    // Select first items
    if (this.scenarios.length > 0) {
      this.selectedScenarioId = this.scenarios[0].id
    }
    if (this.datasets.length > 0) {
      this.selectedDatasetId = this.datasets[0].id
    }
    if (this.predicates.length > 0) {
      this.selectedPredicateId = this.predicates[0].id
    }
  }

  /**
   * Parse a YAML string and initialize the editor from it.
   *
   * @param yamlString The YAML string to parse.
   * @returns An error message if parsing failed, or undefined if successful.
   */
  parseYamlAndInit(yamlString: string): string | undefined {
    try {
      const parsed = yaml.parse(yamlString)

      // The YAML should be an array of group specs
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return 'Invalid YAML: expected an array of test groups'
      }

      const groupSpec = parsed[0] as CheckGroupSpec
      if (!groupSpec.describe || !groupSpec.tests || !Array.isArray(groupSpec.tests)) {
        return 'Invalid YAML: group must have "describe" and "tests" properties'
      }

      if (groupSpec.tests.length === 0) {
        return 'Invalid YAML: group must have at least one test'
      }

      const testSpec = groupSpec.tests[0] as CheckTestSpec
      if (!testSpec.it) {
        return 'Invalid YAML: test must have an "it" property'
      }

      // Initialize from the spec
      this.initFromSpec(groupSpec, testSpec)
      return undefined
    } catch (e) {
      return `Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  /**
   * Add a scenario from a spec.
   *
   * @param spec The scenario spec to convert.
   */
  private addScenarioFromSpec(spec: CheckScenarioSpec): void {
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
   * Add a dataset from a spec.
   *
   * @param spec The dataset spec to convert.
   */
  private addDatasetFromSpec(spec: CheckDatasetSpec): void {
    if (spec.name) {
      const outputVar = this.outputVars.find(v => v.varName === spec.name)
      if (outputVar) {
        const newDataset: DatasetItemConfig = {
          id: `dataset-${this.nextDatasetId++}`,
          datasetKey: outputVar.datasetKey
        }
        this.datasets.push(newDataset)
      }
    }
    // Note: The editor currently supports only datasets specified by name.
    // Dataset groups (spec.group) and type matching (spec.matching) are not
    // supported in the editor and will be silently ignored. These features
    // require access to model-level information to expand into individual datasets.
  }

  /**
   * Add a predicate from a spec.
   *
   * @param spec The predicate spec to convert.
   */
  private addPredicateFromSpec(spec: CheckPredicateSpec): void {
    const predicateTypes: PredicateType[] = ['gt', 'gte', 'lt', 'lte', 'eq', 'approx']
    let type: PredicateType = 'gt'
    let refSpec: number | { dataset: unknown; scenario?: unknown } | undefined

    // Find which predicate type is specified
    for (const t of predicateTypes) {
      if (spec[t] !== undefined) {
        type = t
        refSpec = spec[t]
        break
      }
    }

    const newPredicate: PredicateItemConfig = {
      id: `predicate-${this.nextPredicateId++}`,
      type,
      ref: { kind: 'constant', value: 0 }
    }

    // Convert the reference
    if (typeof refSpec === 'number') {
      newPredicate.ref = { kind: 'constant', value: refSpec }
    } else if (refSpec && typeof refSpec === 'object') {
      // Data reference
      newPredicate.ref = { kind: 'data' }
      const dataRef = refSpec as { dataset: unknown; scenario?: unknown }

      // Dataset reference
      if (dataRef.dataset === 'inherit') {
        newPredicate.ref.datasetRefKind = 'inherit'
      } else if (dataRef.dataset && typeof dataRef.dataset === 'object') {
        const datasetSpec = dataRef.dataset as { name: string }
        newPredicate.ref.datasetRefKind = 'name'
        const outputVar = this.outputVars.find(v => v.varName === datasetSpec.name)
        if (outputVar) {
          newPredicate.ref.datasetKey = outputVar.datasetKey
        }
      }

      // Scenario reference
      if (dataRef.scenario === 'inherit') {
        newPredicate.ref.scenarioRefKind = 'inherit'
      } else if (dataRef.scenario && typeof dataRef.scenario === 'object') {
        newPredicate.ref.scenarioRefKind = 'different'
        const scenarioSpec = dataRef.scenario as {
          input?: string
          inputs?: string
          at?: 'default' | 'min' | 'max' | number
        }
        if (scenarioSpec.input) {
          newPredicate.ref.scenarioConfig = {
            kind: 'given-inputs',
            inputs: [
              {
                inputVarId: this.findInputVarId(scenarioSpec.input),
                position: this.convertPosition(scenarioSpec.at)
              }
            ]
          }
        } else if (scenarioSpec.inputs === 'all') {
          newPredicate.ref.scenarioConfig = {
            kind: 'all-inputs',
            position: this.convertPosition(scenarioSpec.at)
          }
        }
      }
    }

    // Tolerance
    if (spec.tolerance !== undefined) {
      newPredicate.tolerance = spec.tolerance
    }

    // Time
    if (spec.time !== undefined) {
      if (typeof spec.time === 'number') {
        // Single time point (CheckPredicateTimeSingle)
        newPredicate.time = { enabled: true, startYear: spec.time }
      } else if (Array.isArray(spec.time)) {
        // Time range as tuple (CheckPredicateTimeRange)
        newPredicate.time = { enabled: true, startYear: spec.time[0], endYear: spec.time[1] }
      } else if (typeof spec.time === 'object') {
        // Time options object (CheckPredicateTimeOptions)
        const timeOptions = spec.time
        const timeConfig: PredicateTimeConfig = { enabled: true }

        // Handle start time (after_incl or after_excl)
        if (timeOptions.after_incl !== undefined) {
          timeConfig.startYear = timeOptions.after_incl
          timeConfig.startType = 'incl'
        } else if (timeOptions.after_excl !== undefined) {
          timeConfig.startYear = timeOptions.after_excl
          timeConfig.startType = 'excl'
        }

        // Handle end time (before_incl or before_excl)
        if (timeOptions.before_incl !== undefined) {
          timeConfig.endYear = timeOptions.before_incl
          timeConfig.endType = 'incl'
        } else if (timeOptions.before_excl !== undefined) {
          timeConfig.endYear = timeOptions.before_excl
          timeConfig.endType = 'excl'
        }

        newPredicate.time = timeConfig
      }
    }

    this.predicates.push(newPredicate)
  }

  /**
   * Convert a position from spec format to our format.
   *
   * @param at The position from the spec.
   * @returns The position in our format.
   */
  private convertPosition(at: 'default' | 'min' | 'max' | number | undefined): ScenarioInputPosition {
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
   * Find an input variable ID by name.
   *
   * @param name The variable name.
   * @returns The variable ID, or empty string if not found.
   */
  private findInputVarId(name: string): string {
    const inputVar = this.inputVars.find(v => v.varName === name)
    return inputVar?.varId || ''
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
   * Add a new dataset with default settings.
   */
  addDataset(): void {
    const defaultDatasetKey = this.outputVars.length > 0 ? this.outputVars[0].datasetKey : ''
    const newDataset: DatasetItemConfig = {
      id: `dataset-${this.nextDatasetId++}`,
      datasetKey: defaultDatasetKey
    }
    this.datasets.push(newDataset)
    // Auto-select the first dataset if none is selected
    if (!this.selectedDatasetId) {
      this.selectedDatasetId = newDataset.id
    }
  }

  /**
   * Select a dataset by ID.
   *
   * @param id The dataset ID to select.
   */
  selectDataset(id: string): void {
    this.selectedDatasetId = id
  }

  /**
   * Remove a dataset by ID.
   *
   * @param id The dataset ID to remove.
   */
  removeDataset(id: string): void {
    const index = this.datasets.findIndex(d => d.id === id)
    if (index !== -1) {
      this.datasets.splice(index, 1)
      // If we removed the selected dataset, select another one
      if (this.selectedDatasetId === id && this.datasets.length > 0) {
        // Select the previous item, or the first item if we removed the first
        const newIndex = Math.max(0, index - 1)
        this.selectedDatasetId = this.datasets[newIndex].id
      }
    }
  }

  /**
   * Update a dataset's configuration.
   *
   * @param id The dataset ID to update.
   * @param updates The updates to apply.
   */
  updateDataset(id: string, updates: Partial<DatasetItemConfig>): void {
    const index = this.datasets.findIndex(d => d.id === id)
    if (index !== -1) {
      // Replace the dataset object to trigger reactivity
      this.datasets[index] = { ...this.datasets[index], ...updates }
    }
  }

  /**
   * Add a new predicate with default settings.
   */
  addPredicate(): void {
    const newPredicate: PredicateItemConfig = {
      id: `predicate-${this.nextPredicateId++}`,
      type: 'gt',
      ref: {
        kind: 'constant',
        value: 0
      }
    }
    this.predicates.push(newPredicate)
    // Auto-select the first predicate if none is selected
    if (!this.selectedPredicateId) {
      this.selectedPredicateId = newPredicate.id
    }
  }

  /**
   * Select a predicate by ID.
   *
   * @param id The predicate ID to select.
   */
  selectPredicate(id: string): void {
    this.selectedPredicateId = id
  }

  /**
   * Remove a predicate by ID.
   *
   * @param id The predicate ID to remove.
   */
  removePredicate(id: string): void {
    const index = this.predicates.findIndex(p => p.id === id)
    if (index !== -1) {
      this.predicates.splice(index, 1)
      // If we removed the selected predicate, select another one
      if (this.selectedPredicateId === id && this.predicates.length > 0) {
        // Select the previous item, or the first item if we removed the first
        const newIndex = Math.max(0, index - 1)
        this.selectedPredicateId = this.predicates[newIndex].id
      }
    }
  }

  /**
   * Update a predicate's configuration.
   *
   * @param id The predicate ID to update.
   * @param updates The updates to apply.
   */
  updatePredicate(id: string, updates: Partial<PredicateItemConfig>): void {
    const index = this.predicates.findIndex(p => p.id === id)
    if (index !== -1) {
      // Replace the predicate object to trigger reactivity
      this.predicates[index] = { ...this.predicates[index], ...updates }
    }
  }

  /**
   * Get the current check test configuration.
   *
   * @returns The current check test configuration.
   */
  getConfig(): CheckTestConfig {
    return {
      scenarios: [...this.scenarios],
      datasets: [...this.datasets],
      predicates: [...this.predicates]
    }
  }

  /**
   * Generate YAML code for the current check test configuration.
   *
   * @returns The YAML code as a string.
   */
  getYamlCode(): string {
    const lines: string[] = []

    lines.push(`- describe: ${this.describeText}`)
    lines.push('  tests:')
    lines.push(`    - it: ${this.testText}`)

    // Generate scenarios
    lines.push('      scenarios:')
    for (const scenario of this.scenarios) {
      if (scenario.kind === 'all-inputs') {
        const position = scenario.position || 'at-default'
        const positionStr = position.replace('at-', '')
        lines.push(`        - with_inputs: all`)
        lines.push(`          at: ${positionStr}`)
      } else if (scenario.kind === 'given-inputs' && scenario.inputs && scenario.inputs.length > 0) {
        for (const input of scenario.inputs) {
          const inputVar = this.inputVars.find(v => v.varId === input.inputVarId)
          if (inputVar) {
            lines.push(`        - with: ${inputVar.varName}`)
            if (input.position === 'at-value') {
              // Output the custom value as a number
              const value = input.customValue ?? inputVar.defaultValue
              lines.push(`          at: ${value}`)
            } else {
              const position = input.position.replace('at-', '')
              lines.push(`          at: ${position}`)
            }
          }
        }
      }
    }

    // Generate datasets
    lines.push('      datasets:')
    for (const dataset of this.datasets) {
      const outputVar = this.outputVars.find(v => v.datasetKey === dataset.datasetKey)
      if (outputVar) {
        lines.push(`        - name: ${outputVar.varName}`)
      }
    }

    // Generate predicates
    lines.push('      predicates:')
    for (const predicate of this.predicates) {
      if (predicate.ref.kind === 'constant') {
        lines.push(`        - ${predicate.type}: ${predicate.ref.value ?? 0}`)
      } else {
        // Data reference predicate
        lines.push(`        - ${predicate.type}:`)

        // Dataset reference
        const datasetRefKind = predicate.ref.datasetRefKind || 'inherit'
        if (datasetRefKind === 'inherit') {
          lines.push('            dataset: inherit')
        } else {
          const outputVar = this.outputVars.find(v => v.datasetKey === predicate.ref.datasetKey)
          if (outputVar) {
            lines.push('            dataset:')
            lines.push(`              name: ${outputVar.varName}`)
          }
        }

        // Scenario reference
        const scenarioRefKind = predicate.ref.scenarioRefKind || 'inherit'
        if (scenarioRefKind === 'inherit') {
          lines.push('            scenario: inherit')
        } else if (predicate.ref.scenarioConfig) {
          // Output the inline scenario configuration
          const scenarioConfig = predicate.ref.scenarioConfig
          lines.push('            scenario:')
          if (scenarioConfig.kind === 'all-inputs') {
            const position = scenarioConfig.position || 'at-default'
            const positionStr = position.replace('at-', '')
            lines.push(`              with_inputs: all`)
            lines.push(`              at: ${positionStr}`)
          } else if (
            scenarioConfig.kind === 'given-inputs' &&
            scenarioConfig.inputs &&
            scenarioConfig.inputs.length > 0
          ) {
            const input = scenarioConfig.inputs[0]
            const inputVar = this.inputVars.find(v => v.varId === input.inputVarId)
            if (inputVar) {
              lines.push(`              with: ${inputVar.varName}`)
              if (input.position === 'at-value') {
                const value = input.customValue ?? inputVar.defaultValue
                lines.push(`              at: ${value}`)
              } else {
                const position = input.position.replace('at-', '')
                lines.push(`              at: ${position}`)
              }
            }
          }
        }
      }
      if (predicate.type === 'approx' && predicate.tolerance !== undefined) {
        lines.push(`          tolerance: ${predicate.tolerance}`)
      }
      // Time range
      if (predicate.time?.enabled) {
        const hasStart = predicate.time.startYear !== undefined
        const hasEnd = predicate.time.endYear !== undefined
        const startType = predicate.time.startType || 'incl'
        const endType = predicate.time.endType || 'incl'

        if (hasStart && hasEnd) {
          // Both start and end specified - check if we can use simple array format
          if (startType === 'incl' && endType === 'incl') {
            lines.push(`          time: [${predicate.time.startYear}, ${predicate.time.endYear}]`)
          } else {
            // Use explicit format with after_incl/after_excl and before_incl/before_excl
            const startKey = startType === 'incl' ? 'after_incl' : 'after_excl'
            const endKey = endType === 'incl' ? 'before_incl' : 'before_excl'
            lines.push(`          time:`)
            lines.push(`            ${startKey}: ${predicate.time.startYear}`)
            lines.push(`            ${endKey}: ${predicate.time.endYear}`)
          }
        } else if (hasStart) {
          // Only start specified
          if (startType === 'incl') {
            lines.push(`          time: ${predicate.time.startYear}`)
          } else {
            lines.push(`          time:`)
            lines.push(`            after_excl: ${predicate.time.startYear}`)
          }
        } else if (hasEnd) {
          // Only end specified
          const endKey = endType === 'incl' ? 'before_incl' : 'before_excl'
          lines.push(`          time:`)
          lines.push(`            ${endKey}: ${predicate.time.endYear}`)
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * Create a graph box view model for preview.
   *
   * @returns The check summary graph box view model.
   */
  createGraphBoxViewModel(): CheckSummaryGraphBoxViewModel | undefined {
    // For preview, use the selected scenario, dataset, and predicate
    if (this.scenarios.length === 0 || this.datasets.length === 0 || this.predicates.length === 0) {
      return undefined
    }

    // Find the selected items, or fall back to first items if none selected
    const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId) || this.scenarios[0]
    const selectedDataset = this.datasets.find(d => d.id === this.selectedDatasetId) || this.datasets[0]
    const selectedPredicate = this.predicates.find(p => p.id === this.selectedPredicateId) || this.predicates[0]

    if (!selectedDataset.datasetKey) {
      return undefined
    }

    // Create a check scenario from the scenario config
    const scenario: CheckScenario = this.createScenario(selectedScenario)

    // Create a CheckDataset for the current dataset (used for data reference inherit mode)
    const currentDataset: CheckDataset = {
      datasetKey: selectedDataset.datasetKey,
      name: selectedDataset.datasetKey
    }

    // Create a predicate report from the predicate config, passing current dataset and scenario
    // for data reference inherit mode
    const predicateReport: CheckPredicateReport = this.createPredicateReport(
      selectedPredicate,
      currentDataset,
      scenario
    )

    // Create and return the graph box view model
    return new CheckSummaryGraphBoxViewModel(
      this.dataCoordinator,
      scenario,
      selectedDataset.datasetKey,
      predicateReport
    )
  }

  /**
   * Convert a ScenarioInputPosition to an InputPosition for the check-core API.
   * Custom values ('at-value') are converted to 'at-default' for preview purposes.
   *
   * @param position The scenario input position.
   * @returns The InputPosition for check-core.
   */
  private toInputPosition(position: ScenarioInputPosition): 'at-default' | 'at-minimum' | 'at-maximum' {
    if (position === 'at-value') {
      return 'at-default'
    }
    return position
  }

  /**
   * Create a check scenario from a scenario item config.
   *
   * @param config The scenario item configuration.
   * @returns The check scenario.
   */
  private createScenario(config: ScenarioItemConfig): CheckScenario {
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
   * Convert an InputPosition to a short key for use in UIDs.
   *
   * @param position The input position.
   * @returns The key string.
   */
  private positionKey(position: InputPosition): string {
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
   * Create a check scenario from a predicate scenario config.
   * This is similar to createScenario but works with PredicateScenarioConfig.
   *
   * @param config The predicate scenario configuration.
   * @returns The check scenario.
   */
  private createScenarioFromConfig(config: PredicateScenarioConfig): CheckScenario {
    // Convert PredicateScenarioConfig to ScenarioItemConfig by adding a temporary id
    const scenarioItemConfig: ScenarioItemConfig = {
      id: 'predicate-scenario',
      kind: config.kind,
      position: config.position,
      inputs: config.inputs
    }
    return this.createScenario(scenarioItemConfig)
  }

  /**
   * Create a default check scenario (all inputs at default position).
   *
   * @returns The default check scenario.
   */
  private createDefaultScenario(): CheckScenario {
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
   * Convert a PredicateTimeConfig to a CheckPredicateTimeSpec.
   *
   * @param timeConfig The predicate time configuration.
   * @returns The CheckPredicateTimeSpec, or undefined if time is disabled.
   */
  private convertTimeConfig(timeConfig?: PredicateTimeConfig): CheckPredicateTimeSpec | undefined {
    if (!timeConfig || !timeConfig.enabled) {
      return undefined
    }

    // Build the CheckPredicateTimeOptions object based on the time config
    const timeOptions: {
      after_excl?: number
      after_incl?: number
      before_excl?: number
      before_incl?: number
    } = {}

    if (timeConfig.startYear !== undefined) {
      if (timeConfig.startType === 'excl') {
        timeOptions.after_excl = timeConfig.startYear
      } else {
        timeOptions.after_incl = timeConfig.startYear
      }
    }

    if (timeConfig.endYear !== undefined) {
      if (timeConfig.endType === 'excl') {
        timeOptions.before_excl = timeConfig.endYear
      } else {
        timeOptions.before_incl = timeConfig.endYear
      }
    }

    // Only return if at least one time option was set
    if (Object.keys(timeOptions).length === 0) {
      return undefined
    }

    return timeOptions
  }

  /**
   * Create a CheckDataRef from a PredicateRefConfig for data references.
   *
   * @param refConfig The predicate reference configuration.
   * @param currentDataset The current dataset being tested (for inherit mode).
   * @param currentScenario The current scenario (for inherit mode).
   * @returns The CheckDataRef or undefined if the reference is not valid.
   */
  private createDataRef(
    refConfig: PredicateRefConfig,
    currentDataset: CheckDataset | undefined,
    currentScenario: CheckScenario | undefined
  ): CheckDataRef | undefined {
    // Determine the dataset to reference
    let dataset: CheckDataset
    if (refConfig.datasetRefKind === 'inherit') {
      // Use the same dataset that's being tested
      if (!currentDataset) {
        return undefined
      }
      dataset = currentDataset
    } else {
      // Use the specified dataset key
      if (!refConfig.datasetKey) {
        return undefined
      }
      dataset = {
        datasetKey: refConfig.datasetKey,
        name: refConfig.datasetKey
      }
    }

    // Determine the scenario to reference
    let scenario: CheckScenario
    if (refConfig.scenarioRefKind === 'inherit' && currentScenario) {
      // Use the same scenario
      scenario = currentScenario
    } else if (refConfig.scenarioRefKind === 'different' && refConfig.scenarioConfig) {
      // Create a scenario from the inline config
      scenario = this.createScenarioFromConfig(refConfig.scenarioConfig)
    } else if (currentScenario) {
      // Default to current scenario
      scenario = currentScenario
    } else {
      // Fallback to default scenario
      scenario = this.createDefaultScenario()
    }

    return {
      key: scenario.spec ? `${scenario.spec.uid}::${dataset.datasetKey}` : undefined,
      dataset,
      scenario
    }
  }

  /**
   * Create a check predicate report from a predicate item config.
   *
   * @param config The predicate item configuration.
   * @param currentDataset The current dataset being tested (for data reference inherit mode).
   * @param currentScenario The current scenario (for data reference inherit mode).
   * @returns The check predicate report.
   */
  private createPredicateReport(
    config: PredicateItemConfig,
    currentDataset?: CheckDataset,
    currentScenario?: CheckScenario
  ): CheckPredicateReport {
    // Create the opRefs map with the appropriate predicate operator
    const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map()

    // Create the appropriate reference based on the config
    let opRef: CheckPredicateOpRef
    if (config.ref.kind === 'constant') {
      opRef = {
        kind: 'constant',
        value: config.ref.value || 0
      }
    } else {
      // For data references, create a CheckPredicateOpDataRef
      const dataRef = this.createDataRef(config.ref, currentDataset, currentScenario)
      if (dataRef) {
        opRef = {
          kind: 'data',
          dataRef
        }
      } else {
        // Fallback to constant if data ref couldn't be created
        opRef = {
          kind: 'constant',
          value: 0
        }
      }
    }

    // Map our PredicateType to CheckPredicateOp
    const predicateOp = config.type as CheckPredicateOp
    opRefs.set(predicateOp, opRef)

    // Convert time configuration
    const time = this.convertTimeConfig(config.time)

    // Create the predicate report
    return {
      checkKey: 0, // Placeholder key for editor preview
      result: { status: 'passed' }, // Placeholder result
      opRefs,
      opValues: [],
      tolerance: config.tolerance,
      time
    }
  }
}
