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
export type ScenarioKind = 'all-inputs' | 'single-input' | 'input-group'

/** Configuration for a single scenario. */
export interface ScenarioItemConfig {
  id: string
  kind: ScenarioKind
  /** Position for all-inputs or single-input scenarios. */
  position?: InputPosition
  /** Input variable ID for single-input scenarios. */
  inputVarId?: string
  /** Input group name for input-group scenarios. */
  inputGroupName?: string
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
   * Add a new scenario with default settings.
   */
  addScenario(): void {
    const newScenario: ScenarioItemConfig = {
      id: `scenario-${this.nextScenarioId++}`,
      kind: 'all-inputs',
      position: 'at-default'
    }
    this.scenarios.push(newScenario)
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
    }
  }

  /**
   * Update a scenario's configuration.
   *
   * @param id The scenario ID to update.
   * @param updates The updates to apply.
   */
  updateScenario(id: string, updates: Partial<ScenarioItemConfig>): void {
    const scenario = this.scenarios.find(s => s.id === id)
    if (scenario) {
      Object.assign(scenario, updates)
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
    }
  }

  /**
   * Update a dataset's configuration.
   *
   * @param id The dataset ID to update.
   * @param updates The updates to apply.
   */
  updateDataset(id: string, updates: Partial<DatasetItemConfig>): void {
    const dataset = this.datasets.find(d => d.id === id)
    if (dataset) {
      Object.assign(dataset, updates)
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
    }
  }

  /**
   * Update a predicate's configuration.
   *
   * @param id The predicate ID to update.
   * @param updates The updates to apply.
   */
  updatePredicate(id: string, updates: Partial<PredicateItemConfig>): void {
    const predicate = this.predicates.find(p => p.id === id)
    if (predicate) {
      Object.assign(predicate, updates)
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
    // For preview, use the first scenario, dataset, and predicate
    if (this.scenarios.length === 0 || this.datasets.length === 0 || this.predicates.length === 0) {
      return undefined
    }

    const firstScenario = this.scenarios[0]
    const firstDataset = this.datasets[0]
    const firstPredicate = this.predicates[0]

    if (!firstDataset.datasetKey) {
      return undefined
    }

    // Create a check scenario from the scenario config
    const scenario: CheckScenario = this.createScenario(firstScenario)

    // Create a predicate report from the predicate config
    const predicateReport: CheckPredicateReport = this.createPredicateReport(firstPredicate)

    // Create and return the graph box view model
    return new CheckSummaryGraphBoxViewModel(
      this.dataCoordinator,
      scenario,
      firstDataset.datasetKey,
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
    } else if (config.kind === 'single-input' && config.inputVarId) {
      // TODO: Implement single-input scenario creation
      // For now, fall back to all-inputs
      return {
        spec: {
          kind: 'all-inputs',
          uid: 'all-inputs-at-default',
          position: 'at-default'
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
