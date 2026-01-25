// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  InputVar,
  OutputVar,
  DatasetKey,
  CheckDataCoordinator,
  CheckScenario,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport
} from '@sdeverywhere/check-core'

/** The position type for scenario inputs (extends InputPosition with 'at-value'). */
export type ScenarioInputPosition = 'at-default' | 'at-minimum' | 'at-maximum' | 'at-value'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

/** The type of predicate operator. */
export type PredicateType = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'approx'

/** The scenario configuration mode. */
export type ScenarioKind = 'all-inputs' | 'given-inputs'

/** Configuration for a single input in a given-inputs scenario. */
export interface GivenInputConfig {
  inputVarId: string
  position: ScenarioInputPosition
  /** Custom value when position is 'at-value'. */
  customValue?: number
}

/** Configuration for a single scenario. */
export interface ScenarioItemConfig {
  id: string
  kind: ScenarioKind
  /** Position for all-inputs scenarios (only supports preset positions, not at-value). */
  position?: ScenarioInputPosition
  /** Input configurations for given-inputs scenarios. */
  inputs?: GivenInputConfig[]
}

/** Reference type for predicate values. */
export type PredicateRefKind = 'constant' | 'data'

/** Dataset reference type for predicates. */
export type PredicateDatasetRefKind = 'inherit' | 'name'

/** Scenario reference type for predicates. */
export type PredicateScenarioRefKind = 'inherit' | 'different'

/** Configuration for a predicate reference. */
export interface PredicateRefConfig {
  kind: PredicateRefKind
  /** Value for constant references. */
  value?: number
  /** Dataset reference kind for data references. */
  datasetRefKind?: PredicateDatasetRefKind
  /** Dataset key for data references (when datasetRefKind is 'name'). */
  datasetKey?: DatasetKey
  /** Scenario reference kind for data references. */
  scenarioRefKind?: PredicateScenarioRefKind
  /** Scenario ID for data references (when scenarioRefKind is 'different', references existing scenario). */
  scenarioId?: string
}

/** Configuration for a single predicate. */
export interface PredicateItemConfig {
  id: string
  type: PredicateType
  ref: PredicateRefConfig
  tolerance?: number
}

/** Configuration for a single dataset. */
export interface DatasetItemConfig {
  id: string
  datasetKey: DatasetKey
}

/** The complete check test configuration. */
export interface CheckTestConfig {
  scenarios: ScenarioItemConfig[]
  datasets: DatasetItemConfig[]
  predicates: PredicateItemConfig[]
}

/** View model for the check test editor. */
export class CheckEditorViewModel {
  // Test description text fields
  public describeText = $state('Variable or group')
  public testText = $state('should [have behavior] when [conditions]')

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
  public graphBoxViewModel = $derived(this.createGraphBoxViewModel())

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
        lines.push(`        - preset: ${positionStr}`)
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
        } else if (predicate.ref.scenarioId) {
          // Find the referenced scenario and output its configuration
          const refScenario = this.scenarios.find(s => s.id === predicate.ref.scenarioId)
          if (refScenario) {
            lines.push('            scenario:')
            if (refScenario.kind === 'all-inputs') {
              const position = refScenario.position || 'at-default'
              const positionStr = position.replace('at-', '')
              lines.push(`              with_inputs: all`)
              lines.push(`              at: ${positionStr}`)
            } else if (refScenario.kind === 'given-inputs' && refScenario.inputs && refScenario.inputs.length > 0) {
              const input = refScenario.inputs[0]
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
      }
      if (predicate.type === 'approx' && predicate.tolerance !== undefined) {
        lines.push(`          tolerance: ${predicate.tolerance}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Create a graph box view model for preview.
   *
   * @returns The check summary graph box view model.
   */
  private createGraphBoxViewModel(): CheckSummaryGraphBoxViewModel | undefined {
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

    // Create a predicate report from the predicate config
    const predicateReport: CheckPredicateReport = this.createPredicateReport(selectedPredicate)

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
          uid: `all-inputs-${position}`,
          position
        },
        inputDescs: []
      }
    } else if (config.kind === 'given-inputs' && config.inputs && config.inputs.length > 0) {
      // For given-inputs, use the first input for now
      // TODO: Support multiple inputs properly
      const firstInput = config.inputs[0]
      const position = this.toInputPosition(firstInput.position)
      return {
        spec: {
          kind: 'all-inputs',
          uid: `given-inputs-${firstInput.inputVarId}-${firstInput.position}`,
          position
        },
        inputDescs: []
      }
    } else {
      // Default to all-inputs
      return {
        spec: {
          kind: 'all-inputs',
          uid: 'all-inputs-at-default',
          position: 'at-default'
        },
        inputDescs: []
      }
    }
  }

  /**
   * Create a check predicate report from a predicate item config.
   *
   * @param config The predicate item configuration.
   * @returns The check predicate report.
   */
  private createPredicateReport(config: PredicateItemConfig): CheckPredicateReport {
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
      // For data references, we would need to create a CheckPredicateOpDataRef
      // For now, fall back to a constant
      opRef = {
        kind: 'constant',
        value: 0
      }
    }

    // Map our PredicateType to CheckPredicateOp
    const predicateOp = config.type as CheckPredicateOp
    opRefs.set(predicateOp, opRef)

    // Create the predicate report
    return {
      checkKey: 0, // Placeholder key for editor preview
      result: { status: 'passed' }, // Placeholder result
      opRefs,
      opValues: [],
      tolerance: config.tolerance
    }
  }
}
