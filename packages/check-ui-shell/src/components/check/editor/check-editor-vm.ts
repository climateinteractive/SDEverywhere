// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import type {
  InputVar,
  OutputVar,
  InputPosition,
  DatasetKey
} from '@sdeverywhere/check-core'

import type { ListItemViewModel } from '../../playground/list-item-vm'
import type { ComparisonGraphViewModel, Point, ComparisonGraphPlot } from '../../graphs/comparison-graph-vm'

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
  // Input stores
  public readonly scenarioMode: Writable<ScenarioMode>
  public readonly allInputsPosition: Writable<InputPosition>
  public readonly selectedDatasetKey: Writable<DatasetKey>
  public readonly predicateType: Writable<PredicateType>
  public readonly predicateValue: Writable<number>
  public readonly predicateTolerance: Writable<number>

  // Derived stores
  public readonly datasetListItems: Readable<ListItemViewModel[]>
  public readonly graphViewModel: Readable<ComparisonGraphViewModel | undefined>

  /** Called when the user saves the check test. */
  public onSave?: (config: CheckTestConfig) => void

  /** Called when the user cancels editing. */
  public onCancel?: () => void

  /**
   * @param inputVars The list of input variables available in the model.
   * @param outputVars The list of output variables available in the model.
   */
  constructor(
    public readonly inputVars: InputVar[],
    public readonly outputVars: OutputVar[]
  ) {
    // Initialize scenario with "all inputs at default"
    this.scenarioMode = writable('all-inputs')
    this.allInputsPosition = writable('at-default')

    // Initialize dataset with first output variable
    const firstDatasetKey = outputVars.length > 0 ? outputVars[0].datasetKey : ''
    this.selectedDatasetKey = writable(firstDatasetKey)

    // Initialize predicate with "gt: 0"
    this.predicateType = writable('gt')
    this.predicateValue = writable(0)
    this.predicateTolerance = writable(0.1)

    // Create list items for dataset selector
    this.datasetListItems = derived([], () => {
      return this.outputVars.map(outputVar => ({
        id: outputVar.datasetKey,
        label: outputVar.varName
      }))
    })

    // Create graph view model for preview
    this.graphViewModel = derived(
      [this.selectedDatasetKey, this.predicateType, this.predicateValue, this.predicateTolerance],
      ([$datasetKey, $predicateType, $predicateValue, $predicateTolerance]) => {
        return this.createGraphViewModel($datasetKey, $predicateType, $predicateValue, $predicateTolerance)
      }
    )
  }

  /**
   * Update the scenario mode.
   *
   * @param mode The new scenario mode.
   */
  updateScenarioMode(mode: ScenarioMode): void {
    this.scenarioMode.set(mode)
  }

  /**
   * Update the all-inputs position.
   *
   * @param position The new position for all inputs.
   */
  updateAllInputsPosition(position: InputPosition): void {
    this.allInputsPosition.set(position)
  }

  /**
   * Update the selected dataset.
   *
   * @param datasetKey The dataset key for the selected output variable.
   */
  updateSelectedDataset(datasetKey: DatasetKey): void {
    this.selectedDatasetKey.set(datasetKey)
  }

  /**
   * Update the predicate type.
   *
   * @param type The new predicate type.
   */
  updatePredicateType(type: PredicateType): void {
    this.predicateType.set(type)
  }

  /**
   * Update the predicate value.
   *
   * @param value The new predicate value.
   */
  updatePredicateValue(value: number): void {
    this.predicateValue.set(value)
  }

  /**
   * Update the predicate tolerance (for 'approx' predicates).
   *
   * @param tolerance The new tolerance value.
   */
  updatePredicateTolerance(tolerance: number): void {
    this.predicateTolerance.set(tolerance)
  }

  /**
   * Get the current check test configuration.
   *
   * @returns The current check test configuration.
   */
  getConfig(): CheckTestConfig {
    let scenarioConfig: ScenarioConfig
    let scenarioMode: ScenarioMode
    let allInputsPosition: InputPosition
    let datasetKey: DatasetKey
    let predicateType: PredicateType
    let predicateValue: number
    let predicateTolerance: number

    this.scenarioMode.subscribe(v => (scenarioMode = v))()
    this.allInputsPosition.subscribe(v => (allInputsPosition = v))()
    this.selectedDatasetKey.subscribe(v => (datasetKey = v))()
    this.predicateType.subscribe(v => (predicateType = v))()
    this.predicateValue.subscribe(v => (predicateValue = v))()
    this.predicateTolerance.subscribe(v => (predicateTolerance = v))()

    if (scenarioMode === 'all-inputs') {
      scenarioConfig = {
        mode: 'all-inputs',
        allInputsPosition
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
      datasetKey,
      predicate: {
        type: predicateType,
        value: predicateValue,
        tolerance: predicateTolerance
      }
    }
  }

  /**
   * Create a graph view model for preview.
   *
   * @param datasetKey The selected dataset key.
   * @param predicateType The predicate type.
   * @param predicateValue The predicate value.
   * @param predicateTolerance The tolerance for approx predicates.
   * @returns The comparison graph view model.
   */
  private createGraphViewModel(
    datasetKey: DatasetKey,
    predicateType: PredicateType,
    predicateValue: number,
    predicateTolerance: number
  ): ComparisonGraphViewModel | undefined {
    if (!datasetKey) {
      return undefined
    }

    // For now, create a simple mock graph with a sample data line
    // and the predicate reference line(s)
    // TODO: Fetch actual data from the data coordinator

    // Create mock sample data (a simple sine wave for demonstration)
    const sampleDataPoints: Point[] = []
    for (let t = 2000; t <= 2100; t += 1) {
      const y = predicateValue + 5 + 3 * Math.sin((t - 2000) / 10)
      sampleDataPoints.push({ x: t, y })
    }

    const plots: ComparisonGraphPlot[] = [
      {
        points: sampleDataPoints,
        color: 'deepskyblue',
        style: 'normal'
      }
    ]

    // Add predicate reference line(s)
    const refLinePoints: Point[] = [
      { x: 2000, y: predicateValue },
      { x: 2100, y: predicateValue }
    ]

    switch (predicateType) {
      case 'gt':
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'fill-above'
        })
        break
      case 'gte':
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'fill-above'
        })
        break
      case 'lt':
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'fill-below'
        })
        break
      case 'lte':
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'fill-below'
        })
        break
      case 'eq':
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'normal',
          lineWidth: 5
        })
        break
      case 'approx': {
        // Add upper and lower bounds for approx
        const upperBoundPoints: Point[] = [
          { x: 2000, y: predicateValue + predicateTolerance },
          { x: 2100, y: predicateValue + predicateTolerance }
        ]
        const lowerBoundPoints: Point[] = [
          { x: 2000, y: predicateValue - predicateTolerance },
          { x: 2100, y: predicateValue - predicateTolerance }
        ]
        plots.push({
          points: lowerBoundPoints,
          color: 'green',
          style: 'fill-to-next'
        })
        plots.push({
          points: upperBoundPoints,
          color: 'green',
          style: 'normal'
        })
        plots.push({
          points: refLinePoints,
          color: 'green',
          style: 'dashed'
        })
        break
      }
    }

    return {
      key: `check-editor-preview-${datasetKey}`,
      plots,
      xMin: 2000,
      xMax: 2100
    }
  }
}
