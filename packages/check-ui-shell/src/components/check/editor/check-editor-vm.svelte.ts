// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  InputVar,
  OutputVar,
  InputPosition,
  DatasetKey,
  CheckDataCoordinator,
  CheckScenario,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport
} from '@sdeverywhere/check-core'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

/** The type of predicate operator. */
export type PredicateType = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'approx'

/** The scenario configuration mode. */
export type ScenarioKind = 'all-inputs' | 'given-inputs'

/** Configuration for a single input in a given-inputs scenario. */
export interface GivenInputConfig {
  inputVarId: string
  position: InputPosition
}

/** Configuration for a single scenario. */
export interface ScenarioItemConfig {
  id: string
  kind: ScenarioKind
  /** Position for all-inputs scenarios. */
  position?: InputPosition
  /** Input configurations for given-inputs scenarios. */
  inputs?: GivenInputConfig[]
}

/** Reference type for predicate values. */
export type PredicateRefKind = 'constant' | 'data'

/** Configuration for a predicate reference. */
export interface PredicateRefConfig {
  kind: PredicateRefKind
  /** Value for constant references. */
  value?: number
  /** Dataset key for data references. */
  datasetKey?: DatasetKey
  /** Scenario ID for data references. */
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
   * Create a check scenario from a scenario item config.
   *
   * @param config The scenario item configuration.
   * @returns The check scenario.
   */
  private createScenario(config: ScenarioItemConfig): CheckScenario {
    if (config.kind === 'all-inputs') {
      const position = config.position || 'at-default'
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
      return {
        spec: {
          kind: 'all-inputs',
          uid: `given-inputs-${firstInput.inputVarId}-${firstInput.position}`,
          position: firstInput.position
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
