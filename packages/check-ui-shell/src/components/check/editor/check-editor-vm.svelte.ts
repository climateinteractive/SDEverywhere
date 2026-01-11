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
export type ScenarioMode = 'all-inputs' | 'single-input' | 'multiple-inputs'

/** Configuration for a single input setting. */
export interface InputSettingConfig {
  inputVarId: string
  position: InputPosition
}

/** Configuration for the scenario. */
export interface ScenarioConfig {
  mode: ScenarioMode
  allInputsPosition?: InputPosition
  inputSettings?: InputSettingConfig[]
}

/** Configuration for the predicate. */
export interface PredicateConfig {
  type: PredicateType
  value: number
  tolerance?: number
}

/** The complete check test configuration. */
export interface CheckTestConfig {
  scenario: ScenarioConfig
  datasetKey: DatasetKey
  predicate: PredicateConfig
}

/** View model for the check test editor. */
export class CheckEditorViewModel {
  // Reactive state using runes
  public scenarioMode = $state('all-inputs' as ScenarioMode)
  public allInputsPosition = $state('at-default' as InputPosition)
  public selectedDatasetKey = $state('')
  public predicateType = $state('gt' as PredicateType)
  public predicateValue = $state(0)
  public predicateTolerance = $state(0.1)

  // Derived state
  public datasetListItems: ListItemViewModel[]
  public graphBoxViewModel = $derived(this.createGraphBoxViewModel(
    this.allInputsPosition,
    this.selectedDatasetKey,
    this.predicateType,
    this.predicateValue,
    this.predicateTolerance
  ))

  /** Called when the user saves the check test. */
  public onSave?: (config: CheckTestConfig) => void

  /** Called when the user cancels editing. */
  public onCancel?: () => void

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
    // Initialize dataset with first output variable
    this.selectedDatasetKey = outputVars.length > 0 ? outputVars[0].datasetKey : ''

    // Create list items for dataset selector
    this.datasetListItems = this.outputVars.map(outputVar => ({
      id: outputVar.datasetKey,
      label: outputVar.varName
    }))
  }

  /**
   * Update the scenario mode.
   *
   * @param mode The new scenario mode.
   */
  updateScenarioMode(mode: ScenarioMode): void {
    this.scenarioMode = mode
  }

  /**
   * Update the all-inputs position.
   *
   * @param position The new position for all inputs.
   */
  updateAllInputsPosition(position: InputPosition): void {
    this.allInputsPosition = position
  }

  /**
   * Update the selected dataset.
   *
   * @param datasetKey The dataset key for the selected output variable.
   */
  updateSelectedDataset(datasetKey: DatasetKey): void {
    this.selectedDatasetKey = datasetKey
  }

  /**
   * Update the predicate type.
   *
   * @param type The new predicate type.
   */
  updatePredicateType(type: PredicateType): void {
    this.predicateType = type
  }

  /**
   * Update the predicate value.
   *
   * @param value The new predicate value.
   */
  updatePredicateValue(value: number): void {
    this.predicateValue = value
  }

  /**
   * Update the predicate tolerance (for 'approx' predicates).
   *
   * @param tolerance The new tolerance value.
   */
  updatePredicateTolerance(tolerance: number): void {
    this.predicateTolerance = tolerance
  }

  /**
   * Get the current check test configuration.
   *
   * @returns The current check test configuration.
   */
  getConfig(): CheckTestConfig {
    let scenarioConfig: ScenarioConfig
    if (this.scenarioMode === 'all-inputs') {
      scenarioConfig = {
        mode: 'all-inputs',
        allInputsPosition: this.allInputsPosition
      }
    } else {
      // For now, only support all-inputs mode
      // TODO: Add support for single-input and multiple-inputs modes
      scenarioConfig = {
        mode: 'all-inputs',
        allInputsPosition: 'at-default'
      }
    }

    return {
      scenario: scenarioConfig,
      datasetKey: this.selectedDatasetKey,
      predicate: {
        type: this.predicateType,
        value: this.predicateValue,
        tolerance: this.predicateTolerance
      }
    }
  }

  /**
   * Create a graph box view model for preview.
   *
   * @param position The position for all inputs.
   * @param datasetKey The selected dataset key.
   * @param predicateType The predicate type.
   * @param predicateValue The predicate value.
   * @param predicateTolerance The tolerance for approx predicates.
   * @returns The check summary graph box view model.
   */
  private createGraphBoxViewModel(
    position: InputPosition,
    datasetKey: DatasetKey,
    predicateType: PredicateType,
    predicateValue: number,
    predicateTolerance: number
  ): CheckSummaryGraphBoxViewModel | undefined {
    if (!datasetKey) {
      return undefined
    }

    // Create a scenario for all inputs at the selected position
    const scenario: CheckScenario = this.createScenario(position)

    // Create a predicate report based on the editor's current predicate settings
    const predicateReport: CheckPredicateReport = this.createPredicateReport(
      predicateType,
      predicateValue,
      predicateTolerance
    )

    // Create and return the graph box view model
    return new CheckSummaryGraphBoxViewModel(
      this.dataCoordinator,
      scenario,
      datasetKey,
      predicateReport
    )
  }

  /**
   * Create a check scenario based on the current editor state.
   *
   * @param position The position for all inputs.
   * @returns The check scenario.
   */
  private createScenario(position: InputPosition): CheckScenario {
    // For now, we only support "all inputs" mode
    // Create an AllInputsSpec for all inputs at the given position
    return {
      spec: {
        kind: 'all-inputs',
        uid: `all-inputs-${position}`,
        position
      },
      inputDescs: []
    }
  }

  /**
   * Create a check predicate report based on the current editor state.
   *
   * @param predicateType The predicate type.
   * @param predicateValue The predicate value.
   * @param predicateTolerance The tolerance for approx predicates.
   * @returns The check predicate report.
   */
  private createPredicateReport(
    predicateType: PredicateType,
    predicateValue: number,
    predicateTolerance: number
  ): CheckPredicateReport {
    // Create the opRefs map with the appropriate predicate operator
    const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map()

    // Add the constant reference for the selected predicate type
    const opRef: CheckPredicateOpRef = {
      kind: 'constant',
      value: predicateValue
    }

    // Map our PredicateType to CheckPredicateOp
    const predicateOp = predicateType as CheckPredicateOp
    opRefs.set(predicateOp, opRef)

    // Create the predicate report
    return {
      checkKey: 0, // Placeholder key for editor preview
      result: { status: 'passed' }, // Placeholder result
      opRefs,
      opValues: [],
      tolerance: predicateType === 'approx' ? predicateTolerance : undefined
    }
  }
}
